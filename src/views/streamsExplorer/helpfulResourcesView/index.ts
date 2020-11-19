import { window } from 'vscode';
import { Views } from '../../../utils';
import HelpfulResourcesProvider from './provider';

/**
 * Represents the Helpful Resources view
 */
export default class HelpfulResourcesView {
  constructor() {
    window.createTreeView(Views.StreamsHelpfulResources, {
      treeDataProvider: new HelpfulResourcesProvider(),
      showCollapseAll: true
    });
  }
}
