"use client";

import { useEffect, useState } from "react";
import { onBannerReady } from "@/lib/siteLoaderSignal";

// Full-screen splash shown on every page load (including reloads/direct URL
// visits) — covers everything (header, banner, all content) until BOTH the
// window has finished loading AND the homepage hero banner has its data
// ready, then fades out once. Deliberately no sessionStorage skip: the user
// wants this on every fresh load, not just the first visit ever.
export function SiteLoader() {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    let windowLoaded = false;
    let bannerReady = false;
    let finished = false;

    function maybeFinish() {
      if (finished || !windowLoaded || !bannerReady) return;
      finished = true;
      setFadingOut(true);
      setTimeout(() => setVisible(false), 350);
    }

    function onWindowLoad() {
      windowLoaded = true;
      maybeFinish();
    }

    if (document.readyState === "complete") {
      onWindowLoad();
    } else {
      window.addEventListener("load", onWindowLoad);
    }

    const offBannerReady = onBannerReady(() => {
      bannerReady = true;
      maybeFinish();
    });

    // Pages other than the homepage never mount BannerCarousel, so
    // `bannerReady` would otherwise never fire — treat "no ready signal
    // shortly after mount" as "this page has no banner" and proceed. On the
    // homepage the real signal (data fetched) normally arrives well before
    // this fires; it's a floor, not the typical path.
    const fallback = setTimeout(() => {
      bannerReady = true;
      maybeFinish();
    }, 1200);

    return () => {
      window.removeEventListener("load", onWindowLoad);
      offBannerReady();
      clearTimeout(fallback);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-999 flex flex-col items-center justify-center gap-6 bg-(--navy-900) transition-opacity duration-300 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={fadingOut}
    >
      {/* The logo art has a transparent background with navy text/ring, which
          all but vanishes on the dark loader background — sit it on a white
          disc so it reads, and render it large enough for the fine detail.
          Plain <img> (not next/image) so it always loads even if the image
          optimizer is misconfigured in the deployed environment. */}
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white p-3 shadow-lg sm:h-32 sm:w-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-2.png"
          alt="Humsafar Events"
          width={128}
          height={128}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="site-loader">
        <div className="site-loader__truck-wrapper">
          <div className="site-loader__truck-body">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 198 93" className="site-loader__truck-svg">
              <path
                strokeWidth="3"
                stroke="#282828"
                fill="#F83D3D"
                d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z"
              />
              <path
                strokeWidth="3"
                stroke="#282828"
                fill="#7D7C7C"
                d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z"
              />
              <path
                strokeWidth="2"
                stroke="#282828"
                fill="#282828"
                d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z"
              />
              <rect strokeWidth="2" stroke="#282828" fill="#FFFCAB" rx="1" height="7" width="5" y="63" x="187" />
              <rect strokeWidth="2" stroke="#282828" fill="#282828" rx="1" height="11" width="4" y="81" x="193" />
              <rect strokeWidth="3" stroke="#282828" fill="#DFDFDF" rx="2.5" height="90" width="121" y="1.5" x="6.5" />
              <rect strokeWidth="2" stroke="#282828" fill="#DFDFDF" rx="2" height="4" width="6" y="84" x="1" />
            </svg>
          </div>
          <div className="site-loader__tires">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" className="site-loader__tire-svg">
              <circle strokeWidth="3" stroke="#282828" fill="#282828" r="13.5" cy="15" cx="15" />
              <circle fill="#DFDFDF" r="7" cy="15" cx="15" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" className="site-loader__tire-svg">
              <circle strokeWidth="3" stroke="#282828" fill="#282828" r="13.5" cy="15" cx="15" />
              <circle fill="#DFDFDF" r="7" cy="15" cx="15" />
            </svg>
          </div>
          <div className="site-loader__road" />
        </div>
      </div>

      <p className="font-heading text-xs font-medium uppercase tracking-[.18em] text-(--orange-300)">
        Together in Every Journey
      </p>

      <style jsx>{`
        .site-loader {
          width: fit-content;
          height: fit-content;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .site-loader__truck-wrapper {
          width: 200px;
          height: 100px;
          display: flex;
          flex-direction: column;
          position: relative;
          align-items: center;
          justify-content: flex-end;
          overflow-x: hidden;
        }
        .site-loader__truck-body {
          width: 130px;
          height: fit-content;
          margin-bottom: 6px;
          animation: site-loader-motion 1s linear infinite;
        }
        @keyframes site-loader-motion {
          0% { transform: translateY(0px); }
          50% { transform: translateY(3px); }
          100% { transform: translateY(0px); }
        }
        .site-loader__tires {
          width: 130px;
          height: fit-content;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0px 10px 0px 15px;
          position: absolute;
          bottom: 0;
        }
        .site-loader__tire-svg {
          width: 24px;
        }
        .site-loader__road {
          width: 100%;
          height: 1.5px;
          background-color: #fff3;
          position: relative;
          bottom: 0;
          align-self: flex-end;
          border-radius: 3px;
          overflow: hidden;
        }
        .site-loader__road::before {
          content: "";
          position: absolute;
          width: 20px;
          height: 100%;
          background-color: #fff3;
          right: -50%;
          border-radius: 3px;
          animation: site-loader-road 1.4s linear infinite;
          border-left: 10px solid transparent;
        }
        .site-loader__road::after {
          content: "";
          position: absolute;
          width: 10px;
          height: 100%;
          background-color: #fff3;
          right: -65%;
          border-radius: 3px;
          animation: site-loader-road 1.4s linear infinite;
          border-left: 4px solid transparent;
        }
        @keyframes site-loader-road {
          0% { transform: translateX(0px); }
          100% { transform: translateX(-350px); }
        }
      `}</style>
    </div>
  );
}
