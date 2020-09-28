import RadioButton from 'carbon-components-react/es/components/RadioButton';
import RadioButtonGroup from 'carbon-components-react/es/components/RadioButtonGroup';
import React, { useContext } from 'react';
import { ConfigFileType } from '../constants';
import BuildImageContext from '../context';

const ConfigOptionsContainer = () => {
  const { selectedConfigFileType, setSelectedConfigFileType } = useContext(BuildImageContext);

  return (
    <>
      <div className="config-options-container__instructions">
        Your edge application will be built as a Docker image that can be deployed to edge systems.
        Configure the build by starting with a sample configuration file or selecting an existing
        configuration file (in JSON format).
      </div>
      <div>
        <RadioButtonGroup
          name="radio-button-group-config-file-type"
          onChange={(value) => { setSelectedConfigFileType(value); }}
          orientation="horizontal"
          valueSelected={selectedConfigFileType}
        >
          <RadioButton
            id={ConfigFileType.NEW}
            labelText="Create a sample file"
            value={ConfigFileType.NEW}
          />
          <RadioButton
            id={ConfigFileType.EXISTING}
            labelText="Use an existing file"
            value={ConfigFileType.EXISTING}
          />
        </RadioButtonGroup>
      </div>
    </>
  );
};

export default ConfigOptionsContainer;
