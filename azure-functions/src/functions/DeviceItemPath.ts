export type DeviceItemPath =    `/devices/${string}/items/${string}`

export function isDeviceItemPath(str: string): str is DeviceItemPath {
    return str.match(/^\/devices\/[^\/]+\/items\/[^\/]+$/) !== null;
}
