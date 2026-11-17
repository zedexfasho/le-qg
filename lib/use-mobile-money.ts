"use client";

import { useEffect, useState } from "react";
import { loadMobileMoney, type MobileMoneyConfig } from "./payment";

/** Numéros Wave / Orange Money réglés dans le dashboard (null pendant le chargement) */
export function useMobileMoney(): MobileMoneyConfig | null {
  const [config, setConfig] = useState<MobileMoneyConfig | null>(null);
  useEffect(() => {
    let active = true;
    void loadMobileMoney().then((c) => {
      if (active) setConfig(c);
    });
    return () => {
      active = false;
    };
  }, []);
  return config;
}
