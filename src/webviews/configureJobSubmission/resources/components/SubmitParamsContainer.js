import TextInput from 'carbon-components-react/es/components/TextInput';
import _find from 'lodash/find';
import _uniq from 'lodash/uniq';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

export default class SubmitParamsContainer extends Component {
  initializeSubmissionParamsForSubmit = (submissionTimeValues) => {
    if (Array.isArray(submissionTimeValues)) {
      return submissionTimeValues.map(submissionTimeValue => {
        const { compositeName, defaultValue, name } = submissionTimeValue;
        const strippedDefaultValue = defaultValue ? defaultValue.replace(/^"|"$|^\[|\]$/g, '') : '';
        return {
          ...submissionTimeValue,
          fqn: `${compositeName}.${name}`,
          defaultValue: strippedDefaultValue,
          value: strippedDefaultValue
        };
      });
    }
    return [];
  };

  handleSubmitParam = (event) => {
    const { handleSubmitParamUpdate } = this.props;
    const param = { name: event.target.name, value: event.target.value };
    // Unescape escape sequences
    param.value = param.value
      .replace(/\\f/g, '\f') // form feed
      .replace(/\\n/g, '\n') // new line
      .replace(/\\r/g, '\r') // carriage return
      .replace(/\\t/g, '\t') // horizontal tab
      .replace(/\\v/g, '\v'); // vertical tab
    handleSubmitParamUpdate(param);
  }

  render() {
    const { submitParamsFromApp, submitParamsFromJobConfig } = this.props;
    if (!submitParamsFromApp || submitParamsFromApp.length === 0) {
      return (
        <div className="submit-params-container__body">
          There are no submission-time parameters for this application.
        </div>
      );
    }

    const parsedParams = this.initializeSubmissionParamsForSubmit(submitParamsFromApp);
    const composites = _uniq(parsedParams.map((subVal) => subVal.compositeName)).sort();
    return (
      <>
        {composites.map((composite) => {
          const sortedSubTimeValsForComp = parsedParams
            .filter((subVal) => subVal.compositeName === composite)
            .sort((a, b) => a.index - b.index);
          return (
            <div
              className="submit-params-container__composite-section"
              key={`submitParamSection-${composite}`}
            >
              <h1 className="submit-params-container__composite-title">
                {composite}
              </h1>
              {
                sortedSubTimeValsForComp.map(subVal => {
                  let paramValue = _find(submitParamsFromJobConfig, ['name', subVal.fqn]) || _find(submitParamsFromJobConfig, ['name', subVal.name]);
                  paramValue = paramValue ? (paramValue.value || '') : (subVal.defaultValue || '');
                  // Escape escape sequences
                  paramValue = paramValue
                    .replace(/\f/g, '\\f') // form feed
                    .replace(/\n/g, '\\n') // new line
                    .replace(/\r/g, '\\r') // carriage return
                    .replace(/\t/g, '\\t') // horizontal tab
                    .replace(/\v/g, '\\v'); // vertical tab
                  const placeholder = subVal.kind === 'named' ? 'Enter a value' : 'Enter a comma-separated list of values';
                  const invalidText = subVal.kind === 'named' ? 'A value is required.' : 'A comma-separated list of values is required.';
                  let isInvalid = false;
                  if (!paramValue || paramValue.trim().length < 1) {
                    isInvalid = true;
                  }
                  return (
                    <div
                      className="submit-params-container__parameter-input"
                      key={`SubmitValueInput-${subVal.fqn}`}
                    >
                      <TextInput
                        labelText={subVal.name}
                        name={subVal.fqn}
                        id={subVal.fqn}
                        value={paramValue}
                        invalid={isInvalid}
                        invalidText={invalidText}
                        required
                        placeholder={placeholder}
                        onChange={this.handleSubmitParam}
                      />
                    </div>
                  );
                })
              }
            </div>
          );
        })}
      </>
    );
  }
}

SubmitParamsContainer.propTypes = {
  handleSubmitParamUpdate: PropTypes.func.isRequired,
  submitParamsFromApp: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    compositeName: PropTypes.string.isRequired,
    defaultValue: PropTypes.string
  })).isRequired,
  submitParamsFromJobConfig: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })).isRequired
};
