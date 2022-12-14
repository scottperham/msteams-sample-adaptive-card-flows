import { AdaptiveCardInvokeResponse, Attachment, TaskModuleResponse } from "botbuilder";
import { ServiceContainer } from "./data/serviceContainer";
import "isomorphic-fetch";
import { FlowState } from "../bots/teamsAdaptiveCardFlowBot";

export class InvokeActivityHandler {

    services: ServiceContainer;

    constructor(services: ServiceContainer) {
        this.services = services;
    }

    cancelFlow(name: string) {
        return this.getAdaptiveCardInvokeResponse(this.services.templatingService.getFlowAttachment("start", name));
    }

    startFlow(name: string) {
        return this.getAdaptiveCardInvokeResponse(this.services.templatingService.getFlowAttachment("start", name));
    }

    finishFlow(name: string, state: FlowState) {
        return this.getAdaptiveCardInvokeResponse(this.services.templatingService.getFlowAttachment("finish", name, state));
    }

    makeChoice(name: string) {
        return this.getAdaptiveCardInvokeResponse(this.services.templatingService.getFlowAttachment("options", name));
    }

    madeChoice(name: string, state: FlowState) {
        return this.getAdaptiveCardInvokeResponse(this.services.templatingService.getFlowAttachment(state.choice, name, state));
    }

    private getAdaptiveCardInvokeResponse(attachment?: Attachment): AdaptiveCardInvokeResponse {
        return {
            type: attachment ? attachment.contentType : "",
            statusCode: 200,
            value: attachment ? attachment.content : {}
        };
    }
}