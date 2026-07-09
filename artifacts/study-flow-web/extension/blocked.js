chrome.runtime.sendMessage({ type: "getStatus" }).then((status) => {
  if (status && status.activeBlock) {
    const el = document.getElementById("until");
    el.textContent = `${status.activeBlock.title} — until ${status.activeBlock.endTime}`;
    el.hidden = false;
  }
});
