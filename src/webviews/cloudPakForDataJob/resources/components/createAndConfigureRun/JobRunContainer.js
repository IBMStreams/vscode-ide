import TextArea from 'carbon-components-react/es/components/TextArea';
import TextInput from 'carbon-components-react/es/components/TextInput';
import React, { useEffect } from 'react';
import { Property } from '.';
import HelpTooltip from '../../../../commonComponents/HelpTooltip';
import { useDispatch, useState as useContextState } from '../../context';
import { Action } from '../../reducers/createAndConfigureRunReducer';
import Utils from '../../utils';

const JOB_DOC_URL =
  'https://www.ibm.com/support/knowledgecenter/SSQNUZ_3.5.0/svc-streams/managing-jobs.html';
const JOB_RUN =
  'A job run contains information about a specific job submission, such as its job definition, status, submission information, and runtime information.';

const JOB_RUN_NAME_LABEL = 'Job run name (optional)';
const JOB_RUN_NAME_TOOLTIP_TEXT = (
  <>
    <p>The name of the job run.</p>
    <br />
    <p>{JOB_RUN}</p>
  </>
);
const JOB_RUN_NAME_PLACEHOLDER = 'Enter the job run name';

const JOB_RUN_DESCRIPTION_LABEL = 'Job run description (optional)';
const JOB_RUN_DESCRIPTION_TOOLTIP_TEXT = (
  <>
    <p>The description of the job run.</p>
    <br />
    <p>{JOB_RUN}</p>
  </>
);
const JOB_RUN_DESCRIPTION_PLACEHOLDER = 'Enter the job run description';

const JobRunContainer = () => {
  const dispatch = useDispatch();
  const {
    isShowAllOptionsToggled,
    jobRunName,
    jobRunNameError,
    jobRunDescription,
    jobRunDescriptionError
  } = useContextState();

  // Validate the job run name value
  useEffect(() => {
    let error = false;
    if (jobRunName !== '') {
      error = Utils.validateJobName(jobRunName);
    }
    dispatch({
      type: Action.SET_JOB_RUN_NAME_ERROR,
      payload: error
    });
  }, [jobRunName]);

  // Validate the job run description value
  useEffect(() => {
    let error = false;
    if (jobRunDescription !== '') {
      error = Utils.validateJobDescription(jobRunDescription);
    }
    dispatch({
      type: Action.SET_JOB_RUN_DESCRIPTION_ERROR,
      payload: error
    });
  }, [jobRunDescription]);

  const onTextInputChange = (e) => {
    const { id, value } = e.target;
    switch (id) {
      case Property.JOB_RUN_NAME:
        dispatch({ type: Action.SET_JOB_RUN_NAME, payload: value });
        break;
      case Property.JOB_RUN_DESCRIPTION:
        dispatch({
          type: Action.SET_JOB_RUN_DESCRIPTION,
          payload: value
        });
        break;
      default:
        break;
    }
  };

  if (!isShowAllOptionsToggled) {
    return null;
  }

  return (
    <section>
      <div className="main-container__form-item">
        <TextInput
          type="text"
          id={Property.JOB_RUN_NAME}
          labelText={
            <HelpTooltip
              label={JOB_RUN_NAME_LABEL}
              tooltipText={JOB_RUN_NAME_TOOLTIP_TEXT}
              buttonUrl={JOB_DOC_URL}
            />
          }
          value={jobRunName}
          invalid={!!jobRunNameError}
          invalidText={jobRunNameError || null}
          onChange={onTextInputChange}
          placeholder={JOB_RUN_NAME_PLACEHOLDER}
        />
      </div>
      <div className="main-container__form-item">
        <TextArea
          type="text"
          id={Property.JOB_RUN_DESCRIPTION}
          labelText={
            <HelpTooltip
              label={JOB_RUN_DESCRIPTION_LABEL}
              tooltipText={JOB_RUN_DESCRIPTION_TOOLTIP_TEXT}
              buttonUrl={JOB_DOC_URL}
            />
          }
          value={jobRunDescription}
          invalid={!!jobRunDescriptionError}
          invalidText={jobRunDescriptionError || null}
          onChange={onTextInputChange}
          placeholder={JOB_RUN_DESCRIPTION_PLACEHOLDER}
        />
      </div>
    </section>
  );
};

export default JobRunContainer;
