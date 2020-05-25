/**
 * Message object to send to the extension
 */
interface IRequestMessage<T> {
    req: string;
    command: string;
    args: T;
}

/**
 * Message object sent from the extension
 */
interface IReplyMessage {
    seq: string;
    err: any;
    res: any;
}

// To access the VS Code API object. Can only be invoked once per session.
declare let acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

/**
 * Handle messages between the extension and the webview
 */
export default class MessageHandler {
    private _commandHandler: ((message: any) => void) | null;
    private _lastSentReq: number;
    private _pendingReplies: any;

    constructor(commandHandler: any) {
        this._commandHandler = commandHandler;
        this._lastSentReq = 0;
        this._pendingReplies = Object.create(null);
        window.addEventListener('message', this.handleMessage.bind(this));
    }

    /**
     * Send a message to the extension
     * @param message    The JSON message to send
     */
    public async postMessage(message: any): Promise<any> {
        const req = String(++this._lastSentReq);
        return new Promise<any>((resolve, reject) => {
            this._pendingReplies[req] = { resolve, reject };
            message = Object.assign(message, { req });
            vscode.postMessage(message as IRequestMessage<any>);
        });
    }

    /**
     * Handle messages from the extension
     * @param event    The message event
     */
    private handleMessage(event: any): void {
        const message: IReplyMessage = event.data;
        if (message.seq) {
            const pendingReply = this._pendingReplies[message.seq];
            if (pendingReply) {
                if (message.err) {
                    pendingReply.reject(message.err);
                } else {
                    pendingReply.resolve(message.res);
                }
            }
        }

        if (this._commandHandler) {
            this._commandHandler(message.res);
        }
    }
}
