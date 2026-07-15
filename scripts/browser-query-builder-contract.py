import json
import os
import time
import urllib.request

import websocket

email = os.environ.get("TEST_EMAIL")
password = os.environ.get("TEST_PASSWORD")
if not email or not password:
    raise RuntimeError("Set TEST_EMAIL and TEST_PASSWORD before running this browser test.")

targets = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json/list"))
target = next((item for item in targets if item["type"] == "page"), None)
if not target:
    raise RuntimeError("No Chromium page is available on the DevTools port.")

socket = websocket.create_connection(target["webSocketDebuggerUrl"])
next_id = 1

def command(method, params=None):
    global next_id
    request_id = next_id
    next_id += 1
    socket.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
    while True:
        response = json.loads(socket.recv())
        if response.get("id") != request_id:
            continue
        if "error" in response:
            raise RuntimeError(response["error"]["message"])
        return response["result"]

def evaluate(expression):
    result = command("Runtime.evaluate", {
        "expression": expression,
        "awaitPromise": True,
        "returnByValue": True,
    })
    if "exceptionDetails" in result:
        raise RuntimeError(result["exceptionDetails"].get("text", "Browser evaluation failed"))
    return result["result"].get("value")

def wait_for(expression, label, timeout=15):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if evaluate(expression):
            return
        time.sleep(0.1)
    raise RuntimeError(f"Timed out waiting for {label}. URL={evaluate('location.href')} BODY={evaluate('document.body.innerText').replace(chr(10), ' ')[:500]}")

def page(body):
    return evaluate(f"(() => {{ {body} }})()")

def set_control(selector, value, event="input"):
    selector = json.dumps(selector)
    value = json.dumps(value)
    event = json.dumps(event)
    page(f"""
        const element = document.querySelector({selector});
        if (!element) throw new Error('Missing control: ' + {selector});
        const prototype = element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, {value});
        element.dispatchEvent(new Event({event}, {{ bubbles: true }}));
    """)
    time.sleep(0.15)

def click(selector):
    selector = json.dumps(selector)
    page(f"""
        const element = document.querySelector({selector});
        if (!element) throw new Error('Missing clickable control: ' + {selector});
        element.click();
    """)

def real_click(selector):
    selector_json = json.dumps(selector)
    rect = evaluate(f"""
        (() => {{
          const element = document.querySelector({selector_json});
          if (!element) throw new Error('Missing clickable control: ' + {selector_json});
          const bounds = element.getBoundingClientRect();
          return {{ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }};
        }})()
    """)
    command("Input.dispatchMouseEvent", {"type": "mousePressed", "x": rect["x"], "y": rect["y"], "button": "left", "clickCount": 1})
    command("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": rect["x"], "y": rect["y"], "button": "left", "clickCount": 1})
    time.sleep(0.2)

def choose_option(selector, value):
    selector_json = json.dumps(selector)
    value_json = json.dumps(value)
    details = evaluate(f"""
        (() => {{
          const element = document.querySelector({selector_json});
          if (!element) throw new Error('Missing select: ' + {selector_json});
          element.focus();
          return {{ target: Array.from(element.options).findIndex((option) => option.value === {value_json}) }};
        }})()
    """)
    if details["target"] < 0:
        raise RuntimeError(f"Option {value!r} is unavailable in {selector!r}.")
    command("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Home", "code": "Home"})
    command("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Home", "code": "Home"})
    for _ in range(details["target"]):
        command("Input.dispatchKeyEvent", {"type": "keyDown", "key": "ArrowDown", "code": "ArrowDown"})
        command("Input.dispatchKeyEvent", {"type": "keyUp", "key": "ArrowDown", "code": "ArrowDown"})
    time.sleep(0.2)

try:
    command("Page.navigate", {"url": "http://127.0.0.1:5173/auth/login"})
    wait_for("Boolean(document.querySelector('input[type=email]'))", "login form")
    set_control("input[type=email]", email)
    set_control("input[type=password]", password)
    click("button[type=submit]")
    wait_for("location.pathname === '/'", "successful login")
    wait_for("Boolean(localStorage.getItem('rebase_token'))", "stored authentication token")
    time.sleep(1)

    wait_for("Boolean(document.querySelector('a[href=\"/users\"]'))", "application navigation")
    click("a[href='/users']")
    wait_for("Boolean(document.querySelector('[aria-label=\"Query controls\"]'))", "query builder")

    choose_option("[aria-label='Add filter field']", "created_at")
    real_click("button[aria-label='Add filter']")
    selected_filter = evaluate("document.querySelector('[aria-label=\"Filter field\"]')?.value")
    if selected_filter != "created_at":
        raise RuntimeError(f"Expected a Genesis Date filter, received {selected_filter!r}.")
    choose_option("[aria-label='Genesis Date operator']", "INSIDE")
    selected_operator = evaluate("document.querySelector('[aria-label=\"Genesis Date operator\"]')?.value")
    if selected_operator != "INSIDE":
        raise RuntimeError(f"Expected INSIDE, received {selected_operator!r}.")
    wait_for("Boolean(document.querySelector('[aria-label=\"Genesis Date from\"]')) && Boolean(document.querySelector('[aria-label=\"Genesis Date to\"]'))", "both date range inputs")
    set_control("[aria-label='Genesis Date from']", "2025-01-01T00:00")
    set_control("[aria-label='Genesis Date to']", "2025-12-31T23:59")
    assert json.loads(evaluate("JSON.stringify([document.querySelector('[aria-label=\"Genesis Date from\"]').value, document.querySelector('[aria-label=\"Genesis Date to\"]').value])")) == ["2025-01-01T00:00", "2025-12-31T23:59"]

    choose_option("[aria-label='Add filter field']", "parents")
    real_click("button[aria-label='Add filter']")
    choose_option("[aria-label='Has parent group operator']", "CONTAINSANY")
    set_control("[aria-label='Add Has parent group value']", "groups:one")
    real_click("button[aria-label='Add value']")
    set_control("[aria-label='Add Has parent group value']", "groups:two")
    real_click("button[aria-label='Add value']")
    assert evaluate("document.querySelectorAll('[aria-label^=\"Has parent group value\"]').length") == 2

    choose_option("[aria-label='Has parent group operator']", "CONTAINSNONE")
    set_control("[aria-label='Add Has parent group value']", "groups:blocked")
    real_click("button[aria-label='Add value']")
    assert evaluate("document.querySelectorAll('[aria-label^=\"Has parent group value\"]').length") == 1

    choose_option("[aria-label='Add filter field']", "permissions")
    real_click("button[aria-label='Add filter']")
    choose_option("[aria-label='Has permission operator']", "CONTAINSALL")
    set_control("[aria-label='Add Has permission value']", "read")
    real_click("button[aria-label='Add value']")
    set_control("[aria-label='Add Has permission value']", "write")
    real_click("button[aria-label='Add value']")
    assert evaluate("document.querySelectorAll('[aria-label^=\"Has permission value\"]').length") == 2

    choose_option("[aria-label='Add sort field']", "name")
    real_click("button[aria-label='Add sort']")
    choose_option("[aria-label='Identity Name order']", "ASC")
    choose_option("select:has(option[value='10']):has(option[value='100'])", "10")
    real_click("button[aria-label='Apply query changes']")
    wait_for("!document.querySelector('[role=alert]')", "successful query application")

    print("Browser query-builder contract passed: login, datetime range, record-array lists, string-array lists, sorting, pagination, and apply flow.")
finally:
    socket.close()
