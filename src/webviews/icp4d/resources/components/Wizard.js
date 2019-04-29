import * as React from 'react';
import { Component, Utils } from '../utils';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';

export default class Wizard extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true
        };

        // eslint-disable-next-line no-undef
        this.vscode = acquireVsCodeApi();
        this.utils = new Utils(this.vscode);
        this.component = Component.WIZARD;
    }

    componentDidMount() {
        this.utils.init(this.component, this.setState.bind(this), () => {
            this.utils.getCurrentLoginStep();
        });
    }

    componentDidUpdate() {
        this.utils.persistState(this.component, this.state);
    }

    render() {
        const { loading, currentStep } = this.state;

        if (loading) {
            return null;
        }

        return (
            <div>
                <Step1
                    vscode={this.vscode}
                    utils={this.utils}
                    currentStep={currentStep}
                />
                <Step2
                    vscode={this.vscode}
                    utils={this.utils}
                    currentStep={currentStep}
                />
                <Step3
                    vscode={this.vscode}
                    utils={this.utils}
                    currentStep={currentStep}
                />
            </div>
        );
    }
}
