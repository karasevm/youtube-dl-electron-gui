export interface DownloadAction {
  link: string;
  quality: string;
  directoryPath: string;
}

export interface ProgressModalState {
  show: boolean;
  progress: number;
}

export interface ProgressModalProps extends ProgressModalState {
  onDownloadCancel: () => void;
}

export enum IconState {
  Cross = 0,
  Checkmark = 1,
  Indeterminate = 2,
}

export enum UpdateState {
  Checking = 0,
  Updating = 1,
  Success = 2,
  Error = 3,
}
