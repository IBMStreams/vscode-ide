import FormGroup from 'carbon-components-react/es/components/FormGroup';
import InlineLoading from 'carbon-components-react/es/components/InlineLoading';
import TextInput from 'carbon-components-react/es/components/TextInput';
import _cloneDeep from 'lodash/cloneDeep';
import _uniq from 'lodash/uniq';
import React from 'react';
import HelpTooltip from '../../../../commonComponents/HelpTooltip';
import { useDispatch, useState } from '../../context';
import { Action } from '../../reducers/editReducer';
import Utils from '../../utils';

const SUBMISSION_TIME_PARAMS_LABEL = 'Submission-time parameters';
const SUBMISSION_TIME_PARAMS_HELP_TEXT = (
  <>
    Submission-time parameters are arguments that are specified at the time of
    application launch.
  </>
);
const SUBMISSION_TIME_PARAMS_HELP_URL =
  'https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/submissionvalues.html';

const SubmissionParamsContainer = () => {
  const dispatch = useDispatch();
  const {
    isLoadingAppInfo,
    isLoadingSubmissionTimeParams,
    rawSubmissionTimeParams,
    initialSubmissionTimeParams,
    jobConfigOverlay
  } = useState();

  const onTextInputChange = (e) => {
    const { id, value } = e.target;
    const paramName = id;
    // Unescape escape sequences
    const paramValue = value
      .replace(/\\f/g, '\f') // form feed
      .replace(/\\n/g, '\n') // new line
      .replace(/\\r/g, '\r') // carriage return
      .replace(/\\t/g, '\t') // horizontal tab
      .replace(/\\v/g, '\v'); // vertical tab

    let { submissionParameters } = _cloneDeep(
      jobConfigOverlay.jobConfigOverlays[0].jobConfig
    );
    if (!submissionParameters) {
      submissionParameters = [];
    }
    const matchingParam = submissionParameters.find(
      (submissionParameter) => submissionParameter.name === paramName
    );
    if (matchingParam) {
      matchingParam.value = paramValue;
    } else {
      submissionParameters.push({ name: paramName, value: paramValue });
    }

    dispatch({
      type: Action.SET_SUBMISSION_TIME_PARAMS_IN_JOB_CONFIG_OVERLAY,
      payload: submissionParameters
    });
  };

  if (!rawSubmissionTimeParams && !isLoadingAppInfo) {
    return null;
  }

  const parsedParams = Utils.initializeSubmissionParamsForSubmit(
    rawSubmissionTimeParams
  );
  const composites = _uniq(
    parsedParams.map((subVal) => subVal.compositeName)
  ).sort();
  const submitParamsFromJobConfigOverlay =
    jobConfigOverlay?.jobConfigOverlays?.[0]?.jobConfig?.submissionParameters ||
    null;
  return (
    <FormGroup
      legendText=""
      className="main-container__form-group submit-params-container"
    >
      <h1 className="main-container__section-header">
        <HelpTooltip
          label={SUBMISSION_TIME_PARAMS_LABEL}
          tooltipText={SUBMISSION_TIME_PARAMS_HELP_TEXT}
          buttonUrl={SUBMISSION_TIME_PARAMS_HELP_URL}
        />
      </h1>
      {(isLoadingAppInfo || isLoadingSubmissionTimeParams) && (
        <InlineLoading description="Loading..." />
      )}
      {!isLoadingSubmissionTimeParams &&
      !isLoadingAppInfo &&
      (!rawSubmissionTimeParams || !rawSubmissionTimeParams.length) ? (
        <div className="submit-params-container__body">
          There are no submission-time parameters for this application.
        </div>
      ) : (
        composites.map((composite) => {
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
              {sortedSubTimeValsForComp.map((subVal) => {
                let paramValue =
                  submitParamsFromJobConfigOverlay &&
                  submitParamsFromJobConfigOverlay.find(
                    (param) =>
                      param.name === subVal.fqn || param.name === subVal.name
                  );
                if (paramValue) {
                  paramValue = paramValue.value || '';
                } else {
                  const initialSubmissionParameter = initialSubmissionTimeParams.find(
                    (param) =>
                      param.name === `${subVal.compositeName}.${subVal.name}`
                  );
                  paramValue = initialSubmissionParameter
                    ? initialSubmissionParameter.value
                    : '';
                }
                // Escape escape sequences
                paramValue = paramValue
                  .replace(/\f/g, '\\f') // form feed
                  .replace(/\n/g, '\\n') // new line
                  .replace(/\r/g, '\\r') // carriage return
                  .replace(/\t/g, '\\t') // horizontal tab
                  .replace(/\v/g, '\\v'); // vertical tab
                const placeholder =
                  subVal.kind === 'named'
                    ? 'Enter a value'
                    : 'Enter a comma-separated list of values';
                const invalidText =
                  subVal.kind === 'named'
                    ? 'A value is required.'
                    : 'A comma-separated list of values is required.';
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
                      id={subVal.fqn}
                      value={paramValue}
                      invalid={isInvalid}
                      invalidText={invalidText}
                      required
                      placeholder={placeholder}
                      onChange={onTextInputChange}
                    />
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </FormGroup>
  );
};

export default SubmissionParamsContainer;
