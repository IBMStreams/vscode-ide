import PropTypes from 'prop-types';
import * as React from 'react';
import { Button, ButtonToolbar, Form, Modal } from 'react-bootstrap';
import ReactLoading from 'react-loading';
import Select from 'react-select';
import { Component } from '../utils';
import './Step2.css';

export default class Step2 extends React.Component {
    component = Component.STEP2;

    step = 2;

    constructor(props) {
        super(props);

        this.state = {
            localSelection: null
        };
    }

    componentDidMount() {
        const { utils } = this.props;
        utils.init(this.component, this.setState.bind(this), null);
    }

    componentDidUpdate() {
        const { utils } = this.props;
        utils.persistState(this.component, this.state);
    }

    onInstanceSelectionChange = (selectedInstance) => {
        this.setState({ localSelection: selectedInstance });
    }

    renderLoadingSpinner = () => {
        const { streamsInstances } = this.state;
        return !streamsInstances ? (
            <Modal className='loadingModal' show={!streamsInstances} onHide={() => {}} centered>
                <ReactLoading className='loadingSpinner' type='spin' height='10%' width='10%' />
            </Modal>
        ) : null;
    }

    setInstanceSelection = () => {
        const { localSelection } = this.state;
        const { utils } = this.props;
        utils.setInstance(localSelection.value);
    }

    render() {
        const { currentStep, utils } = this.props;

        const { localSelection, streamsInstances } = this.state;

        if (currentStep !== this.step) {
            return null;
        }

        utils.persistAuth();

        return (
            <div>
                {this.renderLoadingSpinner()}

                {streamsInstances && (
                    <Form>
                        <Form.Group controlId='formInstanceSelection'>
                            <Form.Label>Streams instance</Form.Label>
                            <Select
                                isSearchable
                                options={streamsInstances.map(streamsInstance => ({ value: streamsInstance, label: streamsInstance.ServiceInstanceDisplayName }))}
                                onChange={this.onInstanceSelectionChange}
                                value={localSelection}
                                placeholder='Select a Streams instance'
                            />
                        </Form.Group>

                        <ButtonToolbar className='justify-content-between'>
                            <ButtonToolbar className='justify-content-start'>
                                <Button
                                    variant='primary'
                                    size='sm'
                                    type='submit'
                                    disabled={!localSelection}
                                    onClick={this.setInstanceSelection}
                                >
                                    Next
                                </Button>

                                <Button
                                    variant='secondary'
                                    size='sm'
                                    type='submit'
                                    onClick={() => utils.previousLoginStep()}
                                >
                                    Previous
                                </Button>
                            </ButtonToolbar>

                            <Button
                                variant='secondary'
                                size='sm'
                                type='submit'
                                onClick={() => utils.closePanel()}
                            >
                                Cancel
                            </Button>
                        </ButtonToolbar>
                    </Form>
                )}
            </div>
        );
    }
}

Step2.propTypes = {
    currentStep: PropTypes.number.isRequired,
    utils: PropTypes.shape({
        closePanel: PropTypes.func,
        init: PropTypes.func,
        persistAuth: PropTypes.func,
        persistState: PropTypes.func,
        previousLoginStep: PropTypes.func,
        setInstance: PropTypes.func
    }).isRequired
};
