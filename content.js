function injectHook(url, type = "") {
  const hookScript = document.createElement("script");
  if (type !== "") hookScript.type = "module";
  hookScript.src = url;
  hookScript.onload = function () {
    this.remove();
  };
  (document.head || document.body || document.documentElement).appendChild(
    hookScript
  );
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}
