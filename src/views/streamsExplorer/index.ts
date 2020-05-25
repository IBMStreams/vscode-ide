import { ExtensionContext } from 'vscode';
import DetailsView from './detailsView';
import HelpfulResourcesView from './helpfulResourcesView';
import InstancesView from './instancesView';
import ToolkitsView from './toolkitsView';

/**
 * Represents the Streams Explorer view container
 */
export default class StreamsExplorer {
    private _instancesView: InstancesView;
    private _detailsView: DetailsView;
    private _toolkitsView: ToolkitsView;
    private _helpfulResourcesView: HelpfulResourcesView;

    constructor(context: ExtensionContext) {
        this._instancesView = new InstancesView(context);
        this._detailsView = new DetailsView(context);
        this._toolkitsView = new ToolkitsView();
        this._helpfulResourcesView = new HelpfulResourcesView();
    }

    /**
     * Get the Instances view
     */
    public getInstancesView(): InstancesView {
        return this._instancesView;
    }

    /**
     * Get the Details view
     */
    public getDetailsView(): DetailsView {
        return this._detailsView;
    }

    /**
     * Get the Toolkits view
     */
    public getToolkitsView(): ToolkitsView {
        return this._toolkitsView;
    }

    /**
     * Get the Helpful Resources view
     */
    public getHelpfulResourcesView(): HelpfulResourcesView {
        return this._helpfulResourcesView;
    }

    /**
     * Refresh all the views
     */
    public refresh(): void {
        this.refreshInstancesView();
        setTimeout(() => this.refreshDetailsView(), 1000);
        this.refreshToolkitsView();
    }

    /**
     * Refresh the Instances view
     */
    public refreshInstancesView(): void {
        this._instancesView.refresh();
    }

    /**
     * Refresh the Details view
     */
    public refreshDetailsView(): void {
        this._detailsView.showDetailsForSelection(this._instancesView.getSelected());
    }

    /**
     * Refresh the Toolkits view
     */
    public refreshToolkitsView(): void {
        this._toolkitsView.refresh(false);
    }
}
