import _has from 'lodash/has';
import _isEqual from 'lodash/isEqual';
import * as path from 'path';
import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  Uri
} from 'vscode';
import { BuiltInCommands, Views } from '../../../utils';

/**
 * Tree item that represents a detail
 */
export interface DetailTreeItem {
  label: string;
  value?: string;
  isUrl?: boolean;
  children?: DetailTreeItem[] | null;
}

/**
 * A tree data provider that provides detail data
 */
export class DetailsProvider implements TreeDataProvider<DetailTreeItem> {
  private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
  public readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData
    .event;
  private _extensionPath: string;
  private _defaultTreeData = {
    label: 'Select an item in the Instances view to display its details.'
  };
  private _treeData: any;

  constructor(extensionPath: string) {
    this._extensionPath = extensionPath;
    this._treeData = null;
  }

  public getChildren(element?: DetailTreeItem): DetailTreeItem[] {
    return element
      ? element.children
      : this._treeData || [this._defaultTreeData];
  }

  public getTreeItem(element: DetailTreeItem): TreeItem {
    const { label, value, isUrl, children } = element;
    const isDefaultItem = _isEqual(element, this._defaultTreeData);
    let iconPath = null;
    let command = null;
    if (isDefaultItem) {
      iconPath = {
        light: path.join(
          this._extensionPath,
          'images',
          'icons',
          'light',
          'information.svg'
        ),
        dark: path.join(
          this._extensionPath,
          'images',
          'icons',
          'dark',
          'information.svg'
        )
      };
      command = {
        title: '',
        command: `${Views.StreamsInstances}.${BuiltInCommands.ShowView}`,
        arguments: null
      };
    } else if (isUrl) {
      command = {
        title: '',
        command: BuiltInCommands.Open,
        arguments: [Uri.parse(value)]
      };
    }

    let collapsibleState: TreeItemCollapsibleState;
    if (
      (label === 'Connection details' ||
        label === 'Streams application' ||
        label === 'Configuration') &&
      value === null
    ) {
      collapsibleState = TreeItemCollapsibleState.Expanded;
    } else {
      collapsibleState = children
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None;
    }

    return {
      label,
      description: value || null,
      collapsibleState,
      contextValue: isDefaultItem || children ? null : 'detailTreeItem',
      ...(iconPath && { iconPath }),
      command
    };
  }

  /**
   * Refresh the view
   */
  public refresh(): void {
    // This calls getChildren
    this._onDidChangeTreeData.fire();
  }

  /**
   * Set tree data
   * @param data the tree data
   */
  public setTreeData(data: any): void {
    this._treeData = data;
  }

  /**
   * Generate tree data
   * @param element the element
   * @param properties the element properties to display
   */
  public generateTreeData(element: any, properties: any): DetailTreeItem[] {
    if (!element || !properties) {
      return;
    }
    this._treeData = properties
      .filter((property: any) => _has(element, property.name))
      .map((property: any) => {
        const {
          name,
          label,
          isUrl,
          formatFn,
          mapFn,
          childProperties
        } = property;
        const propertyValue = element[name];
        if (childProperties) {
          const children = Object.keys(propertyValue)
            .sort()
            .map((key) => {
              const matchingProperty = childProperties.find(
                (childProperty: any) => childProperty.name === key
              );
              if (matchingProperty) {
                const value = propertyValue[key];
                if (matchingProperty.mapFn) {
                  const children = value.map(matchingProperty.mapFn);
                  return {
                    label: matchingProperty.label,
                    value: children && children.length ? null : 'none',
                    children: children && children.length ? children : null
                  };
                }
                if (matchingProperty.childProperties) {
                  const children = Object.keys(value).map((key) => {
                    const matchingChildProperty = matchingProperty.childProperties.find(
                      (childProperty: any) => childProperty.name === key
                    );
                    if (matchingChildProperty) {
                      return {
                        label: matchingChildProperty.label,
                        value: this.getStringValue(value[key]),
                        isUrl: matchingChildProperty.isUrl
                      };
                    }
                    return null;
                  });
                  return {
                    label: matchingProperty.label,
                    value: null,
                    children: children && children.length ? children : null
                  };
                }
                return {
                  label: matchingProperty.label,
                  value: matchingProperty.formatFn
                    ? matchingProperty.formatFn(value)
                    : this.getStringValue(value),
                  isUrl: matchingProperty.isUrl
                };
              }
              return null;
            })
            .filter((child) => child !== null);
          return {
            label,
            value: children && children.length ? null : 'none',
            children: children && children.length ? children : null
          };
        }
        if (mapFn) {
          const children = propertyValue.map(mapFn);
          return {
            label,
            value: children && children.length ? null : 'none',
            children: children && children.length ? children : null
          };
        }
        return {
          label,
          value: formatFn
            ? formatFn(propertyValue)
            : this.getStringValue(propertyValue),
          isUrl
        };
      });
    this.refresh();
  }

  /**
   * Get the string-ified version of a value
   * @param value the value
   */
  private getStringValue(value: any): string {
    if (value === null) {
      return '';
    }
    if (value.toString) {
      return value.toString();
    }
    return value;
  }
}
