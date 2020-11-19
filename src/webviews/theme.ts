import { g100, white } from '@carbon/themes';

enum ThemeToken {
  // Core color tokens
  UI_BACKGROUND = 'uiBackground',
  INTERACTIVE_01 = 'interactive01',
  INTERACTIVE_02 = 'interactive02',
  INTERACTIVE_03 = 'interactive03',
  INTERACTIVE_04 = 'interactive04',
  DANGER = 'danger',
  UI_01 = 'ui01',
  UI_02 = 'ui02',
  UI_03 = 'ui03',
  UI_04 = 'ui04',
  UI_05 = 'ui05',
  TEXT_01 = 'text01',
  TEXT_02 = 'text02',
  TEXT_03 = 'text03',
  TEXT_04 = 'text04',
  TEXT_05 = 'text05',
  TEXT_ERROR = 'textError',
  LINK_01 = 'link01',
  INVERSE_LINK = 'inverseLink',
  ICON_01 = 'icon01',
  ICON_02 = 'icon02',
  ICON_03 = 'icon03',
  FIELD_01 = 'field01',
  FIELD_02 = 'field02',
  INVERSE_01 = 'inverse01',
  INVERSE_02 = 'inverse02',
  SUPPORT_01 = 'support01',
  SUPPORT_02 = 'support02',
  SUPPORT_03 = 'support03',
  SUPPORT_04 = 'support04',
  INVERSE_SUPPORT_01 = 'inverseSupport01',
  INVERSE_SUPPORT_02 = 'inverseSupport02',
  INVERSE_SUPPORT_03 = 'inverseSupport03',
  INVERSE_SUPPORT_04 = 'inverseSupport04',
  OVERLAY_01 = 'overlay01',
  // Interactive color tokens
  FOCUS = 'focus',
  INVERSE_FOCUS_UI = 'inverseFocusUi',
  HOVER_PRIMARY = 'hoverPrimary',
  HOVER_PRIMARY_TEXT = 'hoverPrimaryText',
  HOVER_SECONDARY = 'hoverSecondary',
  HOVER_TERTIARY = 'hoverTertiary',
  HOVER_UI = 'hoverUI',
  HOVER_SELECTED_UI = 'hoverSelectedUI',
  HOVER_DANGER = 'hoverDanger',
  HOVER_ROW = 'hoverRow',
  INVERSE_HOVER_UI = 'inverseHoverUI',
  ACTIVE_PRIMARY = 'activePrimary',
  ACTIVE_SECONDARY = 'activeSecondary',
  ACTIVE_TERTIARY = 'activeTertiary',
  ACTIVE_UI = 'activeUI',
  ACTIVE_DANGER = 'activeDanger',
  SELECTED_UI = 'selectedUI',
  HIGHLIGHT = 'highlight',
  SKELETON_01 = 'skeleton01',
  SKELETON_02 = 'skeleton02',
  VISITED_LINK = 'visitedLink',
  DISABLED_01 = 'disabled01',
  DISABLED_02 = 'disabled02',
  DISABLED_03 = 'disabled03'
}

const PREFIX = '--color-';

/**
 * Handle theme changes
 */
export default class ThemeHandler {
  private _baseTheme: any;

  constructor(applyStylingCallbackFn = null) {
    this.initAndHandleThemeChanges(applyStylingCallbackFn);
  }

  public initAndHandleThemeChanges(
    applyStylingCallbackFn: Function
  ): MutationObserver {
    const onThemeChange = (): void => {
      // Check theme category
      const bodyClasses = document.body.classList;
      if (bodyClasses.contains('vscode-light')) {
        this._baseTheme = white;
      } else if (bodyClasses.contains('vscode-dark')) {
        this._baseTheme = g100;
      } else if (bodyClasses.contains('vscode-high-contrast')) {
        this._baseTheme = g100;
      } else {
        this._baseTheme = white;
      }

      // Set the colors for theme category to the Carbon base theme
      Object.keys(ThemeToken).forEach((token: string) => {
        this._setCssVariable(
          ThemeToken[token],
          this._baseTheme[ThemeToken[token]]
        );
      });

      // Override placeholder text color for dark themes
      if (this._baseTheme === g100) {
        this._setCssVariable(
          ThemeToken.TEXT_03,
          this._baseTheme[ThemeToken.TEXT_05]
        );
      }

      // Re-apply styles
      if (applyStylingCallbackFn) {
        applyStylingCallbackFn();
      }
    };

    // Watch for theme changes
    const observer = new MutationObserver(onThemeChange);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Initialize
    onThemeChange();

    return observer;
  }

  private _setCssVariable(token: ThemeToken, value: any): void {
    const { body } = document;
    const { style: bodyStyle } = body;
    bodyStyle.setProperty(`${PREFIX}${token}`, value);
  }
}
