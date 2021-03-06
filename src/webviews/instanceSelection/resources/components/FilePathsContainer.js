import PropTypes from 'prop-types';
import React from 'react';
import ListItem from 'carbon-components-react/es/components/ListItem';
import UnorderedList from 'carbon-components-react/es/components/UnorderedList';

const FilePathsContainer = (props) => {
  const {
    params: { files, action }
  } = props;

  const getSubTitle = () => {
    let title = '';
    if (action === 'submit' || action === 'upload-bundle-cpd') {
      title =
        files.length === 1
          ? 'Application\xa0bundle: '
          : 'Application\xa0bundles:';
    } else if (action === 'build' || action === 'build-make') {
      const firstFile = files[0];
      title =
        firstFile.trim().endsWith('.spl') || firstFile.trim().endsWith('.splmm')
          ? 'Application:'
          : 'Makefile:';
    } else if (action === 'build-image') {
      const firstFile = files[0];
      if (
        firstFile.trim().endsWith('.spl') ||
        firstFile.trim().endsWith('.splmm')
      ) {
        title = 'Application:';
      } else if (firstFile.trim().toLowerCase().endsWith('Makefile')) {
        title = 'Makefile:';
      } else {
        title =
          files.length === 1
            ? 'Application\xa0bundle: '
            : 'Application\xa0bundles:';
      }
    } else if (action === 'build-toolkit') {
      title = 'Toolkit folder:';
    } else if (
      action === 'build-primitive-operator' ||
      action === 'make-c++-primitive-operator'
    ) {
      title = 'Primitive operator project folder:';
    }
    return title;
  };

  const fileList = () => {
    const filePaths = files.map((file) => {
      return files.length > 1 ? (
        <ListItem key={file}>{file}</ListItem>
      ) : (
        <div key={file} className="file-name">
          {file}
        </div>
      );
    });
    return filePaths;
  };

  return (
    <div
      className={
        files.length > 1 ? 'file-path-container-col' : 'file-path-container-row'
      }
    >
      <div className="file-path-subtitle">{getSubTitle()}</div>
      {files.length > 1 ? (
        <UnorderedList className="file-list">{fileList()}</UnorderedList>
      ) : (
        <div>{fileList()}</div>
      )}
    </div>
  );
};

FilePathsContainer.propTypes = {
  params: PropTypes.shape({
    files: PropTypes.array,
    action: PropTypes.string
  }).isRequired
};

export default FilePathsContainer;
