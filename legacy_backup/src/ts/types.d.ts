
interface Window {
    DemoMode: any;
    GasAPI: any;
    ErrorNotification: any;
    OfflineSyncV2: any;
    showUrlChangeAnimation: (oldUrl: string, newUrl: string, type: string) => void;
    [key: string]: any; // Allow other properties for now
}

declare let window: Window;
