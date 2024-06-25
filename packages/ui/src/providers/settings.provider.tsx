import { FunctionComponent, PropsWithChildren, createContext } from 'react';
import { DefaultSettingsAdapter, AbstractSettingsAdapter } from '../models/settings';

const defaultSettingsAdapter = new DefaultSettingsAdapter();
export const SettingsContext = createContext<AbstractSettingsAdapter>(defaultSettingsAdapter);

/**
 * The goal for this provider is to expose a settings adapter to the SettingsForm component
 * and its children, so they can be used to render the form fields.
 * In addition to that, it also provides a mechanism to read/write the settings values.
 */
export const SettingsProvider: FunctionComponent<PropsWithChildren<{ adapter: AbstractSettingsAdapter }>> = (props) => {
  return <SettingsContext.Provider value={props.adapter}>{props.children}</SettingsContext.Provider>;
};
