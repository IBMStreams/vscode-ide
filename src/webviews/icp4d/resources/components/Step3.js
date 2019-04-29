import PropTypes from 'prop-types';
import * as React from 'react';
import { Alert, Button, ButtonToolbar } from 'react-bootstrap';
import { Component } from '../utils';
import './Step3.css';

export default class Step3 extends React.Component {
    constructor(props) {
        super(props);

        this.component = Component.STEP3;
        this.step = 3;

        this.state = {};
    }

    componentDidMount() {
        const { utils } = this.props;
        utils.init(this.component, this.setState.bind(this), null);
    }

    componentDidUpdate() {
        const { utils } = this.props;
        utils.persistState(this.component, this.state);
    }

    renderStreamsAuthError = (streamsAuthError, selectedInstanceName) => {
        const { utils } = this.props;

        if (!streamsAuthError) {
            return null;
        }

        return (
            <Alert key='StreamsAuthErrorAlert' variant='danger'>
                Error authenticating to Streams instance {selectedInstanceName}

                <div className='buttonContainer'>
                    <ButtonToolbar className='justify-content-between'>
                        <Button
                            variant='outline-secondary'
                            size='sm'
                            type='submit'
                            onClick={() => utils.previousLoginStep()}
                        >
                            Previous
                        </Button>

                        <Button
                            variant='outline-danger'
                            size='sm'
                            onClick={() => utils.closePanel()}
                        >
                            Close
                        </Button>
                    </ButtonToolbar>
                </div>
            </Alert>
        );
    }

    renderStreamsAuthSuccess = (streamsAuthError, selectedInstanceName) => {
        const { utils } = this.props;

        if (streamsAuthError) {
            return null;
        }

        return (
            <Alert key='StreamsAuthSuccessAlert' variant='success'>
                Successfully authenticated to Streams instance {selectedInstanceName}

                <div className='buttonContainer'>
                    <ButtonToolbar className='justify-content-between'>
                        <Button
                            variant='outline-secondary'
                            size='sm'
                            type='submit'
                            onClick={() => utils.previousLoginStep()}
                        >
                            Previous
                        </Button>

                        <Button
                            variant='outline-success'
                            size='sm'
                            onClick={() => utils.closePanel()}
                        >
                            Close
                        </Button>
                    </ButtonToolbar>
                </div>
            </Alert>
        );
    }

    render() {
        const { currentStep } = this.props;

        const { streamsAuthError, selectedInstanceName } = this.state;

        if (currentStep !== this.step || streamsAuthError == null) {
            return null;
        }

        return (
            <div>
                {this.renderStreamsAuthError(streamsAuthError, selectedInstanceName)}
                {this.renderStreamsAuthSuccess(streamsAuthError, selectedInstanceName)}
            </div>
        );
    }
}

Step3.propTypes = {
    currentStep: PropTypes.number.isRequired,
    utils: PropTypes.shape({
        closePanel: PropTypes.func,
        init: PropTypes.func,
        persistState: PropTypes.func,
        previousLoginStep: PropTypes.func
    }).isRequired
};
