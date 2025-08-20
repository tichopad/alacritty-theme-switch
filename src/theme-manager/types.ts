/** Alias for a string representing a full file path */
export type FilePath = string;

/** Theme entry */
export type Theme = {
  path: FilePath;
  label: string;
  isCurrentlyActive: boolean | null;
};

/** Alacritty configuration file content */
export type Config = {
  // This is the only section we're really interested in
  general?: {
    // This is an array of file paths containing partial Alacritty configurations
    import?: string[];
  };
  [key: string]: unknown;
};
