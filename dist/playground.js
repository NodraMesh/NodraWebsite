/* Nodra Mesh Playground v1: standalone offline simulation, no real network connections. */
(() => {
  "use strict";
  const stage = document.getElementById("mesh-stage");
  if (!stage) return;

  const links = document.getElementById("mesh-links");
  const packet = document.getElementById("mesh-packet");
  const sender = document.getElementById("mesh-sender");
  const receiver = document.getElementById("mesh-receiver");
  const sendButton = document.getElementById("mesh-send");
  const resetButton = document.getElementById("mesh-reset");
  const status = document.getElementById("mesh-status");

  const initial = [
    { id: "A", x: 12, y: 48 },
    { id: "B", x: 29, y: 23 },
    { id: "C", x: 31, y: 80 },
    { id: "D", x: 51, y: 45 },
    { id: "E", x: 73, y: 25 },
    { id: "F", x: 86, y: 49 }
  ];
  const nodes = initial.map(node => ({ ...node }));
  const byId = id => nodes.find(node => node.id === id);
  const range = 39;
  const ns = "http://www.w3.org/2000/svg";
  const elements = new Map();
  let delivery = null;
  let moving = false;
  let generation = 0;

  function linked(a, b) {
    const dx = (a.x - b.x) * 1.25;
    const dy = (a.y - b.y) * 0.95;
    return Math.hypot(dx, dy) <= range;
  }

  function neighbours(id) {
    const node = byId(id);
    return nodes.filter(other => other.id !== id && linked(node, other))
      .map(other => other.id);
  }

  function findPath(start, finish) {
    if (start === finish) return [start];
    const seen = new Set([start]);
    const queue = [[start]];
    while (queue.length) {
      const path = queue.shift();
      for (const neighbour of neighbours(path[path.length - 1])) {
        if (seen.has(neighbour)) continue;
        const candidate = path.concat(neighbour);
        if (neighbour === finish) return candidate;
        seen.add(neighbour);
        queue.push(candidate);
      }
    }
    return null;
  }

  function setStatus(message, state = "idle") {
    status.textContent = message;
    status.dataset.state = state;
  }

  function setPacketPosition(x, y) {
    packet.style.left = x + "%";
    packet.style.top = y + "%";
  }

  function render() {
    for (const node of nodes) {
      const button = elements.get(node.id);
      button.style.left = node.x + "%";
      button.style.top = node.y + "%";
      button.classList.toggle("is-source", node.id === sender.value);
      button.classList.toggle("is-target", node.id === receiver.value);
      button.classList.toggle("is-current", !!delivery && node.id === delivery.current);
    }

    const route = findPath(delivery ? delivery.current : sender.value, receiver.value);
    const highlighted = new Set();
    if (route) {
      for (let i = 1; i < route.length; i++) {
        highlighted.add([route[i - 1], route[i]].sort().join("-"));
      }
    }
    links.replaceChildren();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (!linked(a, b)) continue;
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(a.x));
        line.setAttribute("y1", String(a.y));
        line.setAttribute("x2", String(b.x));
        line.setAttribute("y2", String(b.y));
        if (highlighted.has([a.id, b.id].sort().join("-"))) {
          line.classList.add("is-route");
        }
        links.appendChild(line);
      }
    }
    if (delivery && !moving && !packet.hidden) {
      const at = byId(delivery.current);
      setPacketPosition(at.x, at.y);
    }
  }

  function cancelDelivery() {
    generation++;
    delivery = null;
    moving = false;
    packet.hidden = true;
    sendButton.disabled = false;
  }

  function animateHop(startId, endId, token, finished) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 40 : 650;
    let started = null;
    function frame(time) {
      if (token !== generation) return;
      if (started === null) started = time;
      const fraction = Math.min((time - started) / duration, 1);
      const eased = fraction * fraction * (3 - 2 * fraction);
      const start = byId(startId), end = byId(endId);
      setPacketPosition(
        start.x + (end.x - start.x) * eased,
        start.y + (end.y - start.y) * eased
      );
      if (fraction < 1) requestAnimationFrame(frame);
      else finished();
    }
    requestAnimationFrame(frame);
  }

  function advance(token) {
    if (token !== generation || !delivery || moving) return;
    if (delivery.current === delivery.destination) {
      delivery.state = "delivered";
      sendButton.disabled = false;
      setStatus("Доставлено! Пакет прошёл " + delivery.hops + " " +
        (delivery.hops === 1 ? "переход." : delivery.hops < 5 ? "перехода." : "переходов."), "delivered");
      render();
      return;
    }
    if (delivery.hops >= 20) {
      delivery.state = "waiting";
      setStatus("Достигнут лимит 20 переходов. Отправьте новый пакет.", "waiting");
      sendButton.disabled = false;
      return;
    }
    const path = findPath(delivery.current, delivery.destination);
    if (!path || path.length < 2) {
      delivery.state = "waiting";
      sendButton.disabled = false;
      setStatus("Нет маршрута. Пакет хранится на узле " +
        delivery.current + " и ждёт появления связи. Переместите узлы.", "waiting");
      render();
      return;
    }
    const from = delivery.current, to = path[1];
    delivery.state = "moving";
    moving = true;
    sendButton.disabled = true;
    setStatus("Передача пакета: " + from + " → " + to +
      ". Пройдено переходов: " + delivery.hops + ".", "moving");
    render();
    animateHop(from, to, token, () => {
      if (token !== generation || !delivery) return;
      delivery.current = to;
      delivery.hops++;
      moving = false;
      render();
      advance(token);
    });
  }

  function maybeResume() {
    if (delivery && delivery.state === "waiting" && !moving &&
        delivery.hops < 20) {
      advance(generation);
    }
  }

  for (const node of nodes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "playground-node";
    button.textContent = node.id;
    button.setAttribute("aria-label", "Узел " + node.id + ". Переместить мышью или стрелками.");
    stage.appendChild(button);
    elements.set(node.id, button);
    let dragging = null;

    button.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = event.pointerId;
      button.setPointerCapture(event.pointerId);
      button.classList.add("is-dragging");
    });
    button.addEventListener("pointermove", event => {
      if (dragging !== event.pointerId) return;
      const box = stage.getBoundingClientRect();
      node.x = Math.max(8, Math.min(92, (event.clientX - box.left) / box.width * 100));
      node.y = Math.max(11, Math.min(87, (event.clientY - box.top) / box.height * 100));
      render();
      maybeResume();
    });
    const endDrag = event => {
      if (dragging !== event.pointerId) return;
      dragging = null;
      button.classList.remove("is-dragging");
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
      maybeResume();
    };
    button.addEventListener("pointerup", endDrag);
    button.addEventListener("pointercancel", endDrag);
    button.addEventListener("lostpointercapture", () => {
      dragging = null;
      button.classList.remove("is-dragging");
    });
    button.addEventListener("keydown", event => {
      const movements = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] };
      const movement = movements[event.key];
      if (!movement) return;
      event.preventDefault();
      node.x = Math.max(8, Math.min(92, node.x + movement[0]));
      node.y = Math.max(11, Math.min(87, node.y + movement[1]));
      render();
      maybeResume();
    });
  }

  function start() {
    if (moving) return;
    if (sender.value === receiver.value) {
      setStatus("Выберите разные узлы для отправки и получения.");
      return;
    }
    cancelDelivery();
    const token = generation;
    delivery = {
      current: sender.value,
      destination: receiver.value,
      hops: 0,
      state: "waiting"
    };
    packet.hidden = false;
    setPacketPosition(byId(sender.value).x, byId(sender.value).y);
    render();
    advance(token);
  }

  function reset() {
    cancelDelivery();
    nodes.forEach((node, i) => {
      node.x = initial[i].x;
      node.y = initial[i].y;
    });
    sender.value = "A";
    receiver.value = "F";
    render();
    setStatus("Сеть готова. Выберите узлы и отправьте пакет.");
  }

  sender.addEventListener("change", () => {
    cancelDelivery();
    render();
    setStatus("Выберите узлы и отправьте пакет.");
  });
  receiver.addEventListener("change", () => {
    cancelDelivery();
    render();
    setStatus("Выберите узлы и отправьте пакет.");
  });
  sendButton.addEventListener("click", start);
  resetButton.addEventListener("click", reset);
  reset();
})();
