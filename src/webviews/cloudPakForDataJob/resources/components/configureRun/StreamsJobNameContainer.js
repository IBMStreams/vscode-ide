import TextInput from 'carbon-components-react/es/components/TextInput';
import React, { useEffect } from 'react';
import { Property } from '.';
import HelpTooltip from '../../../../commonComponents/HelpTooltip';
import { useDispatch, useState } from '../../context';
import { Action } from '../../reducers/configureRunReducer';
import Utils from '../../utils';

const JOB_DOC_URL =
  'https://www.ibm.com/support/knowledgecenter/SSQNUZ_3.5.0/svc-streams/managing-jobs.html';

const STREAMS_JOB_NAME_LABEL = 'Streams job name (optional)';
const STREAMS_JOB_NAME_TOOLTIP_TEXT = 'The name of the Streams job.';
const STREAMS_JOB_NAME_PLACEHOLDER = 'Enter the Streams job name';

const StreamsJobNameContainer = () => {
  const dispatch = useDispatch();
  const { streamsJobName, streamsJobNameError } = useState();

  // Validate the Streams job name value
  useEffect(() => {
    let error = false;
    if (streamsJobName !== '') {
      error = Utils.validateStreamsJobName(streamsJobName);
    }
    dispatch({
      type: Action.SET_STREAMS_JOB_NAME_ERROR,
      payload: error
    });
  }, [streamsJobName]);

  const onTextInputChange = (e) => {
    const { id, value } = e.target;
    switch (id) {
      case Property.STREAMS_JOB_NAME:
        dispatch({ type: Action.SET_STREAMS_JOB_NAME, payload: value });
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
          id={Property.STREAMS_JOB_NAME}
          labelText={
            <HelpTooltip
              label={STREAMS_JOB_NAME_LABEL}
              tooltipText={STREAMS_JOB_NAME_TOOLTIP_TEXT}
              buttonUrl={JOB_DOC_URL}
            />
          }
          value={streamsJobName}
          invalid={!!streamsJobNameError}
          invalidText={streamsJobNameError || null}
          onChange={onTextInputChange}
          placeholder={STREAMS_JOB_NAME_PLACEHOLDER}
        />
      </div>
    </section>
  );
};

export default StreamsJobNameContainer;
