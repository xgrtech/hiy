/**
 * hiy.ai inline embed loader.
 * Usage: <script src="https://hiy.ai/embed.js" data-twin="your-name" async></script>
 * Injects a style-isolated iframe where the script tag sits, lazy-loaded
 * when scrolled near the viewport. The snippet never needs to change —
 * all customization lives in the twin's dashboard config.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var twin = script.getAttribute("data-twin");
  if (!twin) return;
  var origin = new URL(script.src).origin;

  var holder = document.createElement("div");
  holder.style.cssText =
    "width:100%;max-width:680px;min-height:420px;margin:0 auto;";
  script.parentNode.insertBefore(holder, script.nextSibling);

  function mount() {
    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed/" + encodeURIComponent(twin);
    iframe.title = "Chat with " + twin + "'s AI twin";
    iframe.loading = "lazy";
    iframe.style.cssText =
      "width:100%;height:520px;border:0;border-radius:20px;background:transparent;";
    iframe.setAttribute("allowtransparency", "true");
    holder.appendChild(iframe);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          io.disconnect();
          mount();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(holder);
  } else {
    mount();
  }
})();
