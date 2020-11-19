import Button from 'carbon-components-react/es/components/Button';
import TextInput from 'carbon-components-react/es/components/TextInput';
import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';
import { Property } from '.';
import HelpTooltip from '../../../../commonComponents/HelpTooltip';
import MessageHandler from '../../../../message.ts';
import { useDispatch, useState } from '../../context';
import { Action } from '../../reducers/configureRunReducer';
import Utils from '../../utils';

const APP_BUNDLE_DOC_URL =
  'https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/streaming_applications.html';

const APP_BUNDLE_FILE_PATH_LABEL = 'Application bundle file path';
const APP_BUNDLE_FILE_PATH_TOOLTIP_TEXT = (
  <p>
    A Streams application is compiled into an executable file called a Streams
    application bundle. The application bundle file contains all elements,
    including Streams toolkit artifacts, that are required to execute an
    application. The application bundle file has a file extension of
    <code>.sab</code>.
  </p>
);
const APP_BUNDLE_FILE_PATH_PLACEHOLDER = 'Enter the file path';

const AppBundleContainer = ({ messageHandler }) => {
  const dispatch = useDispatch();
  const {
    appBundleFilePath,
    appBundleFilePathError,
    existingRawSubmissionTimeParams,
    existingInitialSubmissionTimeParams,
    existingJobConfigOverlay
  } = useState();
  const isInitialMount = useRef(true);

  // Validate the application bundle file path value
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      const checkIfFileExists = async () => {
        let fileError = null;
        let rawParams = existingRawSubmissionTimeParams;
        let initialParams = existingInitialSubmissionTimeParams;
        const fileExists = await messageHandler.postMessage({
          command: 'check-if-sab-file-is-valid',
          args: { filePath: appBundleFilePath }
        });
        if (fileExists) {
          dispatch({
            type: Action.SET_IS_LOADING_SUBMISSION_TIME_PARAMS,
            payload: true
          });
          const bundleParams = await messageHandler.postMessage({
            command: 'get-submission-time-parameters',
            args: { filePath: appBundleFilePath }
          });
          if (bundleParams) {
            rawParams = bundleParams;
            initialParams = Utils.processSubmissionTimeParams(bundleParams);
            dispatch({
              type: Action.SET_SUBMISSION_TIME_PARAMS_IN_JOB_CONFIG_OVERLAY,
              payload: initialParams
            });
          }
          dispatch({
            type: Action.SET_IS_LOADING_SUBMISSION_TIME_PARAMS,
            payload: false
          });
        } else {
          fileError = 'This file does not exist or is not valid.';
        }
        dispatch({
          type: Action.SET_APP_BUNDLE_FILE_PATH_ERROR,
          payload: fileError
        });
        if (fileError && existingJobConfigOverlay) {
          dispatch({
            type: Action.SET_JOB_CONFIG_OVERLAY,
            payload: existingJobConfigOverlay
          });
        }
        dispatch({
          type: Action.SET_RAW_SUBMISSION_TIME_PARAMS,
          payload: rawParams
        });
        dispatch({
          type: Action.SET_INITIAL_SUBMISSION_TIME_PARAMS,
          payload: initialParams
        });
      };
      if (appBundleFilePath !== '') {
        checkIfFileExists();
      } else {
        dispatch({
          type: Action.SET_APP_BUNDLE_FILE_PATH_ERROR,
          payload: false
        });
        dispatch({
          type: Action.SET_RAW_SUBMISSION_TIME_PARAMS,
          payload: existingRawSubmissionTimeParams
        });
        dispatch({
          type: Action.SET_INITIAL_SUBMISSION_TIME_PARAMS,
          payload: existingInitialSubmissionTimeParams
        });
        if (existingJobConfigOverlay) {
          dispatch({
            type: Action.SET_JOB_CONFIG_OVERLAY,
            payload: existingJobConfigOverlay
          });
        }
      }
    }
  }, [appBundleFilePath]);

  const onBrowse = async () => {
    const path = await messageHandler.postMessage({
      command: 'browse-for-file',
      args: { filters: { SAB: ['sab'] } }
    });
    if (path) {
      dispatch({
        type: Action.SET_APP_BUNDLE_FILE_PATH,
        payload: path
      });
    }
  };

  return (
    <section>
      <div className="main-container__form-item main-container__form-item--flex">
        <TextInput
          type="text"
          id={Property.APP_BUNDLE_FILE_PATH}
          labelText={
            <HelpTooltip
              label={APP_BUNDLE_FILE_PATH_LABEL}
              tooltipText={APP_BUNDLE_FILE_PATH_TOOLTIP_TEXT}
              buttonUrl={APP_BUNDLE_DOC_URL}
            />
          }
          value={appBundleFilePath}
          invalid={!!appBundleFilePathError}
          invalidText={appBundleFilePathError || null}
          onChange={(e) =>
            dispatch({
              type: Action.SET_APP_BUNDLE_FILE_PATH,
              payload: e.target.value
            })
          }
          placeholder={APP_BUNDLE_FILE_PATH_PLACEHOLDER}
        />
        <Button
          kind="tertiary"
          size="field"
          onClick={onBrowse}
          className="main-container__browse-button"
        >
          Browse...
        </Button>
      </div>
    </section>
  );
};

AppBundleContainer.propTypes = {
  messageHandler: PropTypes.instanceOf(MessageHandler).isRequired
};

export default AppBundleContainer;
