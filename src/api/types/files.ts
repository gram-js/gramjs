export interface ApiFile {
  '@type': 'file';
  id: number;
  size: number;
  expected_size: number;
  local: {
    '@type': 'localFile';
    path: string;
    can_be_downloaded: boolean;
    can_be_deleted: boolean;
    is_downloading_active: boolean;
    is_downloading_completed: boolean;
  };
  remote: {
    '@type': 'remoteFile';
    id: string;
    is_uploading_active: boolean;
    is_uploading_completed: boolean;
    uploaded_size: number;
  };
  blob?: Blob;
  blobUrl?: string;
}

export interface ApiFileSource {
  dataUri: string;
}

export interface ApiFileLocation {
  dcId: int;
  volumeId: MTProto.long;
  localId: number;
}
