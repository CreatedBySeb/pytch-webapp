import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useScrollToUrlFragment(offset = 0) {
  const hash = useLocation().hash;
  useEffect(() => {
    const appRoot = document.getElementById("App-react-root");
    const targetElt = document.getElementById(hash.replace("#", ""));

    // Shouldn't happen:
    if (appRoot == null || targetElt == null) return;

    appRoot.scrollTo({ top: targetElt.offsetTop - offset });
  });
}
