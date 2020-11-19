import TextArea from 'carbon-components-react/es/components/TextArea';
import TextInput from 'carbon-components-react/es/components/TextInput';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { Property } from '.';
import HelpTooltip from '../../../../commonComponents/HelpTooltip';
import { useDispatch, useState as useContextState } from '../../context';
import { Action } from '../../reducers/editReducer';
import Utils from '../../utils';

const JOB_DOC_URL =
  'https://www.ibm.com/support/knowledgecenter/SSQNUZ_3.5.0/svc-streams/managing-jobs.html';
const JOB_DEFINITION =
  'A job definition contains information about a job, such as its name, description, assets, scheduling, and runtime environment.';

const JOB_DEFINITION_NAME_LABEL = 'Job definition name (optional)';
const JOB_DEFINITION_NAME_TOOLTIP_TEXT = (
  <>
    <p>The name of the job definition.</p>
    <br />
    <p>{JOB_DEFINITION}</p>
  </>
);
const JOB_DEFINITION_NAME_PLACEHOLDER = 'Enter the job definition name';

const JOB_DEFINITION_DESCRIPTION_LABEL =
  'Job definition description (optional)';
const JOB_DEFINITION_DESCRIPTION_TOOLTIP_TEXT = (
  <>
    <p>The description of the job definition.</p>
    <br />
    <p>{JOB_DEFINITION}</p>
  </>
);
const JOB_DEFINITION_DESCRIPTION_PLACEHOLDER =
  'Enter the job definition description';

const JobDefinitionContainer = ({ jobNames }) => {
  const dispatch = useDispatch();
  const {
    isShowAllOptionsToggled,
    existingJobDefinitionName,
    jobDefinitionName,
    jobDefinitionNameError,
    jobDefinitionDescription,
    jobDefinitionDescriptionError
  } = useContextState();

  // Validate the job definition name value
  useEffect(() => {
    let error = false;
    if (jobDefinitionName !== '') {
      error = Utils.validateJobName(jobDefinitionName);
      if (
        !error &&
        jobDefinitionName !== existingJobDefinitionName &&
        jobNames.includes(jobDefinitionName)
      ) {
        error = 'A job definition already exists with this name.';
      }
    }
    dispatch({
      type: Action.SET_JOB_DEFINITION_NAME_ERROR,
      payload: error
    });
  }, [jobDefinitionName]);

  // Validate the job definition description value
  useEffect(() => {
    let error = false;
    if (jobDefinitionDescription !== '') {
      error = Utils.validateJobDescription(jobDefinitionDescription);
    }
    dispatch({
      type: Action.SET_JOB_DEFINITION_DESCRIPTION_ERROR,
      payload: error
    });
  }, [jobDefinitionDescription]);

  const onTextInputChange = (e) => {
    const { id, value } = e.target;
    switch (id) {
      case Property.JOB_DEFINITION_NAME:
        dispatch({ type: Action.SET_JOB_DEFINITION_NAME, payload: value });
        break;
      case Property.JOB_DEFINITION_DESCRIPTION:
        dispatch({
          type: Action.SET_JOB_DEFINITION_DESCRIPTION,
          payload: value
        });
        break;
      default:
        break;
    }
  };

  return (
    <section>
      <div className="main-container__form-item">
        <TextInput
          type="text"
          id={Property.JOB_DEFINITION_NAME}
          labelText={
            <HelpTooltip
              label={JOB_DEFINITION_NAME_LABEL}
              tooltipText={JOB_DEFINITION_NAME_TOOLTIP_TEXT}
              buttonUrl={JOB_DOC_URL}
            />
          }
          value={jobDefinitionName}
          invalid={!!jobDefinitionNameError}
          invalidText={jobDefinitionNameError || null}
          onChange={onTextInputChange}
          placeholder={JOB_DEFINITION_NAME_PLACEHOLDER}
        />
      </div>
      {isShowAllOptionsToggled && (
        <div className="main-container__form-item">
          <TextArea
            type="text"
            id={Property.JOB_DEFINITION_DESCRIPTION}
            labelText={
              <HelpTooltip
                label={JOB_DEFINITION_DESCRIPTION_LABEL}
                tooltipText={JOB_DEFINITION_DESCRIPTION_TOOLTIP_TEXT}
                buttonUrl={JOB_DOC_URL}
              />
            }
            value={jobDefinitionDescription}
            invalid={!!jobDefinitionDescriptionError}
            invalidText={jobDefinitionDescriptionError || null}
            onChange={onTextInputChange}
            placeholder={JOB_DEFINITION_DESCRIPTION_PLACEHOLDER}
          />
        </div>
      )}
    </section>
  );
};

JobDefinitionContainer.propTypes = {
  jobNames: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default JobDefinitionContainer;
