declare module 'image-decode' {
    export interface DecodedImage {
        data: Uint8ClampedArray;
        width: number;
        height: number;
    }
    function decode(imageData: Buffer | ArrayBuffer | Uint8Array): DecodedImage;
    export = decode;
}
