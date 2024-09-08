document.addEventListener("DOMContentLoaded", async function () {
  const syntaxClasses = [
    ["# Hi", "comment"],
    ["True", "constant.language"],
    ["\\u2014", "constant.language.escape"],
    ["42", "constant.numeric"],
    ["my_func", "entity.name.function"],
    ["enumerate", "function.support"],
    //["debugger", "invalid.deprecated"],
    ["while", "keyword"],
    ["!=", "keyword.operator"],
    ["(", "paren.lparen"],
    [")", "paren.rparen"],
    [":", "punctuation"],
    ['"Hi"', "string"],
    ["self", "variable.language"],
  ];

  // Manually sorted to put light first then dark:
  let allThemes = [
    "chrome.css",
    "cloud9_day.css",
    "clouds.css",
    "crimson_editor.css",
    "dawn.css",
    "dreamweaver.css",
    "eclipse.css",
    "github.css",
    "gruvbox_light_hard.css",
    "iplastic.css",
    "katzenmilch.css",
    "kuroir.css",
    "solarized_light.css",
    "sqlserver.css",
    ["textmate.css", "tm"],
    "tomorrow.css",
    "xcode.css",

    "ambiance.css",
    "chaos.css",
    "cloud9_night.css",
    "cloud9_night_low_color.css",
    "clouds_midnight.css",
    "cobalt.css",
    "dracula.css",
    "github_dark.css",
    "gob.css",
    "gruvbox.css",
    "gruvbox_dark_hard.css",
    "idle_fingers.css",
    "kr_theme.css",
    "merbivore.css",
    "merbivore_soft.css",
    "mono_industrial.css",
    "monokai.css",
    "nord_dark.css",
    "one_dark.css",
    "pastel_on_dark.css",
    "solarized_dark.css",
    ["terminal.css", "terminal-theme"],
    "tomorrow_night.css",
    "tomorrow_night_blue.css",
    "tomorrow_night_bright.css",
    "tomorrow_night_eighties.css",
    "twilight.css",
    "vibrant_ink.css",
  ];

  let data = [];

  const offsetLuminance = (rgb8) => {
    const rgb_01 = rgb8.map((x) => x / 255.0);
    const curve = (x) =>
      x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    const [r, g, b] = rgb_01.map(curve);
    const offsetLum = 0.05 + (0.2126 * r + 0.7152 * g + 0.0722 * b);
    return offsetLum;
  };

  const wcag21Contrast = (rgb0, rgb1) => {
    const [lum0, lum1] = [rgb0, rgb1].map(offsetLuminance);
    return Math.max(lum0, lum1) / Math.min(lum0, lum1);
  };

  const themeProps = (themeDescr) => {
    let themePath, themeClassNub;
    if (Array.isArray(themeDescr)) {
      themePath = themeDescr[0].split(".")[0];
      themeClassNub = themeDescr[1];
    } else {
      themePath = themeDescr.split(".")[0];
      themeClassNub = themePath.replaceAll("_", "-");
    }
    return { themePath, themeClassNub };
  };

  const addThemeStylesheetLink = (themeBasename) => {
    return new Promise((resolve) => {
      let link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = `./ace-builds-css-theme/${themeBasename}.css`;
      link.onload = resolve;

      document.head.appendChild(link);
    });
  };

  const effectiveColours = (bgs, fg) => {
    const canvas = document.createElement("canvas");
    // Get warnings suggesting willReadFrequently, but then don't get
    // correct pixel values.
    const canvasCtx = canvas.getContext("2d");
    const fillCanvas = (fillStyle) => {
      canvasCtx.fillStyle = fillStyle;
      canvasCtx.fillRect(0, 0, 8, 8);
    };
    const canvasRGB8 = () => {
      const imageData = canvasCtx.getImageData(3, 3, 1, 1);
      return Array.from(imageData.data.slice(0, 3));
    };

    bgs.forEach(fillCanvas);
    const effectiveBg = canvasRGB8();
    fillCanvas(fg);
    const effectiveFg = canvasRGB8();

    return { effectiveBg, effectiveFg };
  };

  const computedBg = (elt) => window.getComputedStyle(elt).backgroundColor;
  const computedFg = (elt) => window.getComputedStyle(elt).color;

  const addThemeTableRow = (themeBasename, themeClassNub) => {
    let tRow = document.createElement("TR");
    document.getElementById("samples").appendChild(tRow);

    tRow.classList.add(`ace-${themeClassNub}`);

    let tDatum = document.createElement("TD");
    tDatum.innerText = themeBasename;
    tRow.appendChild(tDatum);

    let worstContrast = Infinity;
    syntaxClasses.forEach((sc) => {
      let tDatum = document.createElement("TD");
      tDatum.innerText = sc[0];

      const dotSepClasses = sc[1];
      const classes = dotSepClasses.split(".");
      classes.forEach((c) => tDatum.classList.add(`ace_${c}`));

      tRow.appendChild(tDatum);

      const { effectiveBg, effectiveFg } = effectiveColours(
        [computedBg(tRow), computedBg(tDatum)],
        computedFg(tDatum)
      );

      const contrast = wcag21Contrast(effectiveBg, effectiveFg);
      tDatum.title = contrast.toFixed(2);
      if (contrast < worstContrast) worstContrast = contrast;

      const datum = {
        theme: themeBasename,
        syntaxClass: sc[1],
        effectiveBg,
        effectiveFg,
        contrast,
      };
      data.push(datum);
    });

    tDatum = document.createElement("TD");
    tDatum.innerText = worstContrast.toFixed(1);
    tDatum.style.backgroundColor = "white";
    tDatum.style.color = "black";
    tDatum.style.paddingLeft = "1em";
    tDatum.style.borderRadius = "0px";
    tDatum.style.textAlign = "right";
    tRow.appendChild(tDatum);
  };

  // allThemes = ["cloud9_day.css"];
  // allThemes = [];
  for (const themeDescr of allThemes) {
    const { themePath, themeClassNub } = themeProps(themeDescr);
    await addThemeStylesheetLink(themePath);
    addThemeTableRow(themePath, themeClassNub);
  }

  const dataJson = JSON.stringify(data, null, 2);
  document.getElementById("JSON-output").innerText = dataJson;
});
