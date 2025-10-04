import React, { createContext, useContext, useEffect, useState } from 'react';
import { DurationConfig, fetchConfig } from '../api';

interface ConfigState {
  config?: DurationConfig;
  loading: boolean;
}

const ConfigContext = createContext<ConfigState>({ loading: true });

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<DurationConfig>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig()
      .then((data) => {
        setConfig(data);
      })
      .finally(() => setLoading(false));
  }, []);

  return <ConfigContext.Provider value={{ config, loading }}>{children}</ConfigContext.Provider>;
};

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('ConfigContext nincs inicializálva');
  }
  return ctx;
}
