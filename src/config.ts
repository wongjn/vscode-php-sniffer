
// Get-interface of VSCode's WorkspaceConfiguration for easier typing in tests.
export interface WorkspaceConfigurationReadable {
  get<T>(section: string, defaultValue: T): T;
}
