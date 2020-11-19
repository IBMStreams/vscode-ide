import Button from 'carbon-components-react/es/components/Button';
import Checkbox from 'carbon-components-react/es/components/Checkbox';
import FormGroup from 'carbon-components-react/es/components/FormGroup';
import RadioButton from 'carbon-components-react/es/components/RadioButton';
import RadioButtonGroup from 'carbon-components-react/es/components/RadioButtonGroup';
import TextInput from 'carbon-components-react/es/components/TextInput';
import Tooltip from 'carbon-components-react/es/components/Tooltip';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import MessageHandler from '../../../message.ts';
import ThemeHandler from '../../../theme.ts';
import ButtonContainer from './ButtonContainer';

const PROJECT_FOLDER_PATH_LABEL = 'Project folder path';
const NAMESPACE_LABEL = 'Operator namespace';
const NAME_LABEL = 'Operator name';
const GENERIC_OPERATOR_LABEL = 'Generic operator';
const OPERATOR_PROCESSING_PATTERN_LABEL = 'Operator processing pattern';
const OPERATOR_PROCESSING_PATTERN_HELP_TEXT = `The operator processing pattern identifies
  whether the operator has input ports, output ports, or both and the type of tuple flow the
  operator provides.`;
const PROCESS_OPERATOR_LABEL =
  'Consumes incoming tuples and produces outgoing tuples';
const PROCESS_OPERATOR_HELP_TEXT = `An operator with both input and output ports usually receives incoming
  tuples on an input port. It processes the tuple data, and then submits new outgoing tuples to an
  output port.`;
const SOURCE_OPERATOR_LABEL = 'Produces outgoing tuples as a source operator';
const SOURCE_OPERATOR_HELP_TEXT = `A source operator submits new outgoing tuples to an output port.
  The data for the new tuples usually comes from an external system or data store. Because this
  type of operator does not have any input ports, it does not receive incoming tuples.`;
const SINK_OPERATOR_LABEL = 'Consumes incoming tuples as a sink operator';
const SINK_OPERATOR_HELP_TEXT = `A sink operator receives tuples on an input port. The tuple data
  is usually sent or stored to an external system or data store. Because this type of operator does
  not have any output ports, it does not produce outgoing tuples.`;

const Property = {
  PROJECT_FOLDER_PATH: 'projectFolderPath',
  NAMESPACE: 'namespace',
  NAME: 'name',
  GENERIC_OPERATOR: 'genericOperator',
  PROCESSING_PATTERN: 'processingPattern'
};

const OperatorProcessingPattern = {
  SOURCE: 'source',
  PROCESS: 'process',
  SINK: 'sink'
};

const CreatePrimitiveOperatorContainer = ({ params: { type, folderPath } }) => {
  // eslint-disable-next-line no-unused-vars
  const themeHandler = new ThemeHandler();
  const messageHandler = new MessageHandler();

  const [projectFolderPath, setProjectFolderPath] = useState(folderPath || '');
  const [namespace, setNamespace] = useState('');
  const [name, setName] = useState('');
  const [operatorProcessingPattern, setOperatorProcessingPattern] = useState(
    OperatorProcessingPattern.PROCESS
  );
  const [genericOperator, setGenericOperator] = useState(true);
  const [projectFolderPathExists, setProjectFolderPathExists] = useState(true);
  const [namespaceError, setNamespaceError] = useState(false);
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    const checkIfFolderExists = async () => {
      const folderExists = await messageHandler.postMessage({
        command: 'check-if-project-folder-exists',
        args: { folderPath: projectFolderPath }
      });
      setProjectFolderPathExists(folderExists);
    };
    if (projectFolderPath !== '') {
      checkIfFolderExists();
    } else {
      setProjectFolderPathExists(true);
    }
  }, [projectFolderPath]);

  useEffect(() => {
    const checkIfValidNamespace = async () => {
      const isValidNamespaceResult = await messageHandler.postMessage({
        command: 'check-if-valid-namespace',
        args: { namespace }
      });
      if (isValidNamespaceResult !== true) {
        setNamespaceError(isValidNamespaceResult);
      } else {
        setNamespaceError(false);
      }
    };
    if (namespace !== '') {
      checkIfValidNamespace();
    } else {
      setNamespaceError(false);
    }
  }, [namespace]);

  useEffect(() => {
    const checkIfValidName = async () => {
      const isValidNameResult = await messageHandler.postMessage({
        command: 'check-if-valid-name',
        args: { name }
      });
      if (isValidNameResult !== true) {
        setNameError(isValidNameResult);
      } else {
        setNameError(false);
      }
    };
    if (name !== '') {
      checkIfValidName();
    } else {
      setNameError(false);
    }
  }, [name]);

  const getHelpTooltip = (label, tooltipText) => {
    return (
      <Tooltip
        triggerText={label}
        iconDescription={label}
        direction="right"
        tabIndex={0}
        className="create-primitive-operator-container__help-tooltip"
      >
        {tooltipText}
      </Tooltip>
    );
  };

  const isProjectFolderPathValueInvalid = () => !projectFolderPathExists;

  const isNamespaceValueInvalid = () => !!namespaceError;

  const isNameValueInvalid = () => !!nameError;

  const getButtonContainer = () => {
    const isValid =
      projectFolderPath.trim() !== '' &&
      namespace.trim() !== '' &&
      name.trim() !== '' &&
      !isProjectFolderPathValueInvalid(projectFolderPath) &&
      !isNamespaceValueInvalid(namespace) &&
      !isNameValueInvalid(name);
    return (
      <ButtonContainer
        primaryBtn={{
          label: 'Create',
          isValid,
          onClick: () => {
            messageHandler.postMessage({
              command: 'create-primitive-operator',
              args: {
                [Property.PROJECT_FOLDER_PATH]: projectFolderPath,
                [Property.NAMESPACE]: namespace,
                [Property.NAME]: name,
                ...(type === 'C++'
                  ? { [Property.GENERIC_OPERATOR]: genericOperator }
                  : {
                      [Property.PROCESSING_PATTERN]: operatorProcessingPattern
                    })
              }
            });
          }
        }}
        secondaryBtn={{
          label: 'Cancel',
          isValid: true,
          onClick: () => messageHandler.postMessage({ command: 'close-panel' })
        }}
      />
    );
  };

  const onTextInputChange = (e) => {
    const { id, value } = e.target;
    switch (id) {
      case Property.PROJECT_FOLDER_PATH:
        setProjectFolderPath(value);
        break;
      case Property.NAMESPACE:
        setNamespace(value);
        break;
      case Property.NAME:
        setName(value);
        break;
      default:
        break;
    }
  };

  const onRadioButtonChange = (value) => {
    setOperatorProcessingPattern(value);
  };

  const onCheckboxChange = (checked) => {
    setGenericOperator(checked);
  };

  const onBrowse = async () => {
    const path = await messageHandler.postMessage({
      command: 'browse-for-project-folder'
    });
    if (path) {
      setProjectFolderPath(path);
    }
  };

  return (
    <div className="bx--grid create-primitive-operator-container">
      <div className="bx--row">
        <div className="bx--col-lg-10 bx--col-md-6">
          <div className="create-primitive-operator-container__form-item create-primitive-operator-container__form-item--flex">
            <TextInput
              type="text"
              id={Property.PROJECT_FOLDER_PATH}
              labelText={getHelpTooltip(
                PROJECT_FOLDER_PATH_LABEL,
                'The project folder path for the primitive operator.'
              )}
              value={projectFolderPath}
              invalid={isProjectFolderPathValueInvalid(projectFolderPath)}
              invalidText={
                projectFolderPath !== '' && !projectFolderPathExists
                  ? 'This folder does not exist.'
                  : 'This value is invalid.'
              }
              onChange={onTextInputChange}
              placeholder="Enter the folder path"
            />
            <Button
              kind="tertiary"
              size="field"
              onClick={onBrowse}
              className="create-primitive-operator-container__browse-button"
            >
              Browse...
            </Button>
          </div>
          <div className="create-primitive-operator-container__form-item">
            <TextInput
              type="text"
              id={Property.NAMESPACE}
              labelText={getHelpTooltip(
                NAMESPACE_LABEL,
                'The SPL namespace for the primitive operator.'
              )}
              value={namespace}
              invalid={isNamespaceValueInvalid(namespace)}
              invalidText={
                namespaceError
                  ? `${namespaceError} Namespace must start with an ASCII letter or underscore, followed by ASCII letters, digits, underscores, or period delimiters.`
                  : null
              }
              onChange={onTextInputChange}
              placeholder="Enter the namespace"
            />
          </div>
          <div className="create-primitive-operator-container__form-item">
            <TextInput
              type="text"
              id={Property.NAME}
              labelText={getHelpTooltip(
                NAME_LABEL,
                'The name of the primitive operator.'
              )}
              value={name}
              invalid={isNameValueInvalid(name)}
              invalidText={
                nameError
                  ? `${nameError} Name must start with an ASCII letter or underscore, followed by ASCII letters, digits, or underscores.`
                  : null
              }
              onChange={onTextInputChange}
              placeholder="Enter the name"
            />
          </div>
          <div className="create-primitive-operator-container__form-item--last">
            {type === 'C++' ? (
              <Checkbox
                id="generic-operator"
                checked={genericOperator}
                labelText={getHelpTooltip(
                  GENERIC_OPERATOR_LABEL,
                  <span>
                    The SPL language supports writing two styles of C++
                    primitive operators, namely: generic operators and
                    non-generic operators.
                    <br />
                    <br />
                    <em>Generic</em> operators can handle various stream types,
                    different numbers of ports, and most importantly, can be
                    configured with parameters and output assignments that
                    involve SPL expressions. Alternately, <em>non-generic</em>{' '}
                    operators are less configurable and are often used for
                    one-time tasks that do not require high levels of reuse.
                  </span>
                )}
                onChange={onCheckboxChange}
                className="create-primitive-operator-container__generic-operator-checkbox"
              />
            ) : (
              <FormGroup
                legendText={getHelpTooltip(
                  OPERATOR_PROCESSING_PATTERN_LABEL,
                  OPERATOR_PROCESSING_PATTERN_HELP_TEXT
                )}
              >
                <RadioButtonGroup
                  name="radio-button-group"
                  onChange={onRadioButtonChange}
                  orientation="vertical"
                  valueSelected={operatorProcessingPattern}
                  className="create-primitive-operator-container__operator-processing-pattern-radio-button-group"
                >
                  <RadioButton
                    id={OperatorProcessingPattern.PROCESS}
                    labelText={getHelpTooltip(
                      PROCESS_OPERATOR_LABEL,
                      PROCESS_OPERATOR_HELP_TEXT
                    )}
                    value={OperatorProcessingPattern.PROCESS}
                  />
                  <RadioButton
                    id={OperatorProcessingPattern.SOURCE}
                    labelText={getHelpTooltip(
                      SOURCE_OPERATOR_LABEL,
                      SOURCE_OPERATOR_HELP_TEXT
                    )}
                    value={OperatorProcessingPattern.SOURCE}
                  />
                  <RadioButton
                    id={OperatorProcessingPattern.SINK}
                    labelText={getHelpTooltip(
                      SINK_OPERATOR_LABEL,
                      SINK_OPERATOR_HELP_TEXT
                    )}
                    value={OperatorProcessingPattern.SINK}
                  />
                </RadioButtonGroup>
              </FormGroup>
            )}
          </div>
          {getButtonContainer()}
        </div>
      </div>
    </div>
  );
};

CreatePrimitiveOperatorContainer.propTypes = {
  params: PropTypes.shape({
    type: PropTypes.string,
    folderPath: PropTypes.string
  }).isRequired
};

export default CreatePrimitiveOperatorContainer;
