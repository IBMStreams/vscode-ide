import { ExtensionContext } from 'vscode';
import StreamsExplorer from './streamsExplorer';

let streamsExplorer: StreamsExplorer;

/**
 * Initialize tree views
 * @param context The extension context
 * @param client The language client
 */
export function initialize(context: ExtensionContext): void {
  streamsExplorer = new StreamsExplorer(context);
}

/**
 * Get Streams Explorer
 */
export function getStreamsExplorer(): StreamsExplorer {
  return streamsExplorer;
}
