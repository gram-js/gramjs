import { default as Api } from '../tl/api';

import TelegramClient from './TelegramClient';
import { generateRandomBytes, readBigIntFromBuffer } from '../Helpers';
import { getAppropriatedPartSize } from '../Utils';

interface OnProgress {
    // Float between 0 and 1.
    (progress: number): void;

    isCanceled?: boolean;
}

export interface UploadFileParams {
    file: File;
    onProgress?: OnProgress;
}

const KB_TO_BYTES = 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;

export async function uploadFile(
    client: TelegramClient,
    fileParams: UploadFileParams,
): Promise<Api.InputFile | Api.InputFileBig> {
    const { file, onProgress } = fileParams;
    const { name, size } = file;

    const fileId = readBigIntFromBuffer(generateRandomBytes(8), true, true);
    const isLarge = size > LARGE_FILE_THRESHOLD;

    const partSize = getAppropriatedPartSize(size) * KB_TO_BYTES;
    const partCount = Math.floor((size + partSize - 1) / partSize);
    const buffer = Buffer.from(await fileToBuffer(file));

    // We always upload from the DC we are in.
    const sender = await client._borrowExportedSender(client.session.dcId);

    if (onProgress) {
        onProgress(0);
    }

    for (let i = 0; i < partCount; i++) {
        const bytes = buffer.slice(i * partSize, (i + 1) * partSize);
        const result = await sender.send(
            isLarge
                ? new Api.upload.SaveBigFilePart({
                    fileId,
                    filePart: i,
                    fileTotalParts: partCount,
                    bytes,
                })
                : new Api.upload.SaveFilePart({
                    fileId,
                    filePart: i,
                    bytes,
                }),
        );

        if (result && onProgress) {
            if (onProgress.isCanceled) {
                throw new Error('USER_CANCELED')
            }

            onProgress((i + 1) / partCount);
        }
    }

    return isLarge
        ? new Api.InputFileBig({
            id: fileId,
            parts: partCount,
            name,
        })
        : new Api.InputFile({
            id: fileId,
            parts: partCount,
            name,
            md5Checksum: '', // This is not a "flag", so not sure if we can make it optional.
        });
}

function generateRandomBigInt() {
    return readBigIntFromBuffer(generateRandomBytes(8), false);
}

function fileToBuffer(file: File) {
    return new Response(file).arrayBuffer();
}
