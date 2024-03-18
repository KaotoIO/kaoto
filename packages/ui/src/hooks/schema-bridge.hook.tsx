import { useContext } from 'react';
import { SchemaBridgeContext } from '../providers/schema-bridge.provider';

export const useSchemaBridgeContext = () => {
  const ctx = useContext(SchemaBridgeContext);

  if (!ctx.schemaBridge) throw new Error('useSchemaBridgeContext needs to be called inside `SchemaBridgeProvider`');

  return ctx;
};
