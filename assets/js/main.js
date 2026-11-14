(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.getElementById("siteHeader");
  var progressBar = document.getElementById("progressBar");
  var preview = document.getElementById("preview");
  var previewImg = preview ? preview.querySelector("img") : null;
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      return id && id.charAt(0) === "#" ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  /* ---------- scroll state ---------- */
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var y = window.scrollY || document.documentElement.scrollTop;

      if (header) header.classList.toggle("is-scrolled", y > 8);

      if (progressBar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? Math.min(100, (y / max) * 100) : 0;
        progressBar.style.width = pct + "%";
      }

      if (sections.length) {
        var current = null;
        var marker = y + window.innerHeight * 0.32;
        sections.forEach(function (section) {
          if (section.offsetTop <= marker) current = section;
        });
        navLinks.forEach(function (link) {
          link.classList.toggle(
            "is-active",
            current !== null && link.getAttribute("href") === "#" + current.id
          );
        });
      }

      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("wheel", hidePreview, { passive: true });
  window.addEventListener("touchstart", hidePreview, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) {
      // 首屏元素立即显示，避免等待观察器回调造成空白
      if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        el.classList.add("is-in");
      } else {
        revealObserver.observe(el);
      }
    });
  }

  /* ---------- floating work preview ---------- */
  var workRows = Array.prototype.slice.call(document.querySelectorAll(".work"));
  var previewVisible = false;

  function movePreview(x, y) {
    if (!preview) return;
    var pad = 24;
    var w = preview.offsetWidth || 320;
    var h = preview.offsetHeight || 240;
    var left = Math.min(Math.max(x, w / 2 + pad), window.innerWidth - w / 2 - pad);
    var top = Math.min(Math.max(y, h / 2 + pad), window.innerHeight - h / 2 - pad);
    preview.style.left = left + "px";
    preview.style.top = top + "px";
  }

  function hidePreview() {
    if (!preview || !previewVisible) return;
    preview.classList.remove("is-visible");
    previewVisible = false;
  }

  if (preview && previewImg && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
    workRows.forEach(function (row) {
      row.addEventListener("pointerenter", function () {
        var src = row.getAttribute("data-preview");
        if (src && previewImg.getAttribute("src") !== src) {
          previewImg.setAttribute("src", src);
        }
        preview.classList.add("is-visible");
        previewVisible = true;
      });

      row.addEventListener("pointermove", function (event) {
        if (!previewVisible) {
          preview.classList.add("is-visible");
          previewVisible = true;
        }
        movePreview(event.clientX, event.clientY);
      });

      row.addEventListener("pointerleave", hidePreview);
      row.addEventListener("focus", function () {
        preview.classList.add("is-visible");
        previewVisible = true;
      });
      row.addEventListener("blur", hidePreview);
    });
  }

  /* ---------- inline screening player ---------- */
  var screenFrame = document.querySelector("[data-screen]");
  var screenVideo = screenFrame ? screenFrame.querySelector("video") : null;

  // 手机上换更小的片源，首次播放快很多
  if (window.matchMedia("(max-width: 640px)").matches) {
    Array.prototype.slice
      .call(document.querySelectorAll("video[data-mobile-src]"))
      .forEach(function (video) {
        video.setAttribute("src", video.getAttribute("data-mobile-src"));
      });
  }

  // 滚动到放映屏附近（或悬停导航的「混剪」）时提前缓冲，点播放就不用干等
  var screenPlay = screenFrame ? screenFrame.querySelector("[data-screen-play]") : null;
  var screenPlayLabel = screenPlay ? screenPlay.querySelector(".screen__play-label") : null;
  var screenPlayLabelHTML = screenPlayLabel ? screenPlayLabel.innerHTML : "";
  var screeningWarmed = false;

  function warmScreening() {
    if (!screenVideo || screeningWarmed) return;
    if (!screenVideo.paused || screenVideo.currentTime > 0) return;
    if (screenFrame.classList.contains("is-loading")) return;
    screeningWarmed = true;
    screenVideo.setAttribute("preload", "auto");
    try {
      screenVideo.load();
    } catch (error) {
      /* 忽略：部分旧浏览器不支持重复 load */
    }
  }

  if (screenVideo) {
    var connection = navigator.connection || {};
    var slowLink =
      connection.saveData || /(^|-)2g$/.test(connection.effectiveType || "");

    if (!slowLink && "IntersectionObserver" in window) {
      var warmObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            warmObserver.disconnect();
            warmScreening();
          });
        },
        { rootMargin: "1600px 0px" }
      );
      warmObserver.observe(screenFrame);
    }

    var screeningNav = document.querySelector('a[href="#fanedit"]');
    if (screeningNav) {
      ["pointerenter", "focus", "touchstart"].forEach(function (type) {
        screeningNav.addEventListener(type, warmScreening, { once: true });
      });
    }
  }

  function stopScreeningLoading() {
    if (!screenFrame) return;
    screenFrame.classList.remove("is-loading");
    if (screenPlayLabel) screenPlayLabel.innerHTML = screenPlayLabelHTML;
  }

  function startScreening() {
    if (!screenVideo || screenFrame.classList.contains("is-loading")) return;
    screenVideo.controls = true;
    screenFrame.classList.add("is-loading");
    if (screenPlayLabel) screenPlayLabel.textContent = "缓冲中…";
    var attempt = screenVideo.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(stopScreeningLoading);
    }
    // 播放键隐藏后把焦点交给视频，键盘用户还能继续操作进度条
    window.requestAnimationFrame(function () {
      try {
        screenVideo.focus({ preventScroll: true });
      } catch (error) {
        /* 老浏览器不支持 focus 选项，忽略 */
      }
    });
  }

  if (screenFrame && screenVideo) {
    if (screenPlay) screenPlay.addEventListener("click", startScreening);
    screenVideo.addEventListener("playing", function () {
      screenVideo.controls = true;
      stopScreeningLoading();
      screenFrame.classList.add("is-playing");
    });
    screenVideo.addEventListener("error", stopScreeningLoading);
  }

  /* ---------- dialogs ---------- */
  var dialogTriggers = Array.prototype.slice.call(document.querySelectorAll("[data-dialog]"));
  var dialogs = Array.prototype.slice.call(document.querySelectorAll("dialog.case"));

  function openDialog(id) {
    var dialog = document.getElementById(id);
    if (!dialog) return;
    hidePreview();
    // 弹窗里播的时候，别让页面上的混剪还在出声
    if (screenVideo && !screenVideo.paused) screenVideo.pause();
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    document.body.style.overflow = "hidden";
    // 案例视频平时不预加载，打开弹窗时再取元数据，避免和首页混剪抢带宽
    var dialogVideo = dialog.querySelector("video");
    if (dialogVideo && dialogVideo.getAttribute("preload") === "none") {
      dialogVideo.setAttribute("preload", "metadata");
      try {
        dialogVideo.load();
      } catch (error) {
        /* 忽略 */
      }
    }
    try {
      if (window.history && history.replaceState) {
        history.replaceState(null, "", "#" + id);
      }
    } catch (error) {
      /* file:// 预览时可能不允许修改历史记录，忽略即可 */
    }
    var closeBtn = dialog.querySelector("[data-close]");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    document.body.style.overflow = "";
    try {
      if (window.history && history.replaceState && location.hash === "#" + dialog.id) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    } catch (error) {
      /* 忽略 file:// 下的历史记录限制 */
    }
  }

  dialogTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      openDialog(trigger.getAttribute("data-dialog"));
    });
  });

  dialogs.forEach(function (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener("close", function () {
      document.body.style.overflow = "";
      // 关掉弹窗时停止播放，避免后台还在出声
      Array.prototype.slice.call(dialog.querySelectorAll("video")).forEach(function (video) {
        video.pause();
      });
    });
    Array.prototype.slice.call(dialog.querySelectorAll("[data-close]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeDialog(dialog);
      });
    });
  });

  /* ---------- deep link to a case ---------- */
  function openCaseFromHash() {
    var id = "";
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch (error) {
      id = "";
    }
    var dialog = id ? document.getElementById(id) : null;
    if (dialog && dialog.tagName === "DIALOG") openDialog(id);
  }

  window.addEventListener("hashchange", openCaseFromHash);
  window.addEventListener("load", openCaseFromHash);

  /* ---------- switch between full film and clip ---------- */
  Array.prototype.slice.call(document.querySelectorAll(".vswitch")).forEach(function (group) {
    var dialog = group.closest("dialog");
    var video = dialog ? dialog.querySelector("[data-video-box]") : null;
    var note = dialog ? dialog.querySelector("[data-video-note]") : null;
    if (!video) return;

    group.addEventListener("click", function (event) {
      var btn = event.target.closest(".vswitch__btn");
      if (!btn) return;
      var src = btn.getAttribute("data-vsrc");
      if (!src || video.getAttribute("src") === src) return;

      Array.prototype.slice.call(group.querySelectorAll(".vswitch__btn")).forEach(function (item) {
        item.classList.toggle("is-active", item === btn);
      });

      video.pause();
      video.setAttribute("src", src);
      video.load();
      if (note) note.textContent = btn.getAttribute("data-vnote") || "";
    });
  });

  /* ---------- stills lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCap = document.getElementById("lightboxCap");
  var lightboxIdx = document.getElementById("lightboxIdx");
  var stillButtons = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));

  function pad2(num) {
    return (num < 10 ? "0" : "") + num;
  }

  function openLightbox(btn) {
    if (!lightbox || !lightboxImg) return;
    var img = btn.querySelector("img");
    if (!img) return;
    lightboxImg.setAttribute("src", img.getAttribute("src"));
    lightboxImg.setAttribute("alt", img.getAttribute("alt") || "");
    if (lightboxCap) {
      lightboxCap.textContent = btn.getAttribute("data-cap") || img.getAttribute("alt") || "";
    }
    if (lightboxIdx) {
      lightboxIdx.textContent =
        pad2(stillButtons.indexOf(btn) + 1) + " / " + pad2(stillButtons.length);
    }
    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    if (typeof lightbox.close === "function") {
      lightbox.close();
    } else {
      lightbox.removeAttribute("open");
    }
    document.body.style.overflow = "";
  }

  stillButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      openLightbox(btn);
    });
  });

  if (lightbox) {
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeLightbox();
    });
    lightbox.addEventListener("close", function () {
      document.body.style.overflow = "";
    });
    Array.prototype.slice
      .call(lightbox.querySelectorAll("[data-lightbox-close]"))
      .forEach(function (btn) {
        btn.addEventListener("click", closeLightbox);
      });
  }

  /* ---------- Guangzhou clock ---------- */
  var clock = document.getElementById("clock");
  if (clock) {
    var formatter = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Shanghai"
    });
    var tick = function () {
      clock.textContent = formatter.format(new Date());
    };
    tick();
    window.setInterval(tick, 30000);
  }

  /* ---------- keep page from restoring scroll over dialog ---------- */
  window.addEventListener("pageshow", function () {
    document.body.style.overflow = "";
  });
})();
