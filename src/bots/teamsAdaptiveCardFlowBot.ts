import { TeamsActivityHandler, TurnContext, UserState, Activity, SigninStateVerificationQuery, MessageFactory, AdaptiveCardInvokeResponse, AdaptiveCardInvokeValue, MessagingExtensionQuery, MessagingExtensionResponse, MessagingExtensionAction, MessagingExtensionActionResponse, FileConsentCardResponse, StatePropertyAccessor, InvokeResponse, TaskModuleRequest, TaskModuleResponse, TabResponse, TabSubmit } from "botbuilder";
import { CommandBase } from "../commands/commandBase";
import { ServiceContainer } from "../services/data/serviceContainer";
import { InvokeActivityHandler } from "../services/invokeActivityHandler";
import { HelloCommand } from "../commands/helloCommand";

export type FlowState = {
    scheduleFor?: string,
    feedbackFor?: string,
    feedback?: string,
    choice: string,
    activityId: string,
    formUrl: string,
    formValue?: string
}

export class TeamsAdaptiveCardFlowBot extends TeamsActivityHandler {

    invokeHandler: InvokeActivityHandler;
    commands: {command: CommandBase, requireAuth: boolean}[];
    defaultCommand: CommandBase;
    services: ServiceContainer;   
    state: {[key: string]: FlowState} = {};
    baseUrl: string;

    constructor(services: ServiceContainer, baseUrl: string) {
        super();

        this.services = services;
        this.invokeHandler = new InvokeActivityHandler(services);
        this.baseUrl = baseUrl;

        // Setup a simple array of available command implementations and whether they require authentication or not
        this.commands = [
            {command: new HelloCommand(services), requireAuth: false }
        ]

        this.defaultCommand = new HelloCommand(services);

        // This is a generic handler for any inbound activity with a type of "text"
        // This could be a simple text message or something more complex like
        // an Adaptive Card result from an Action.Submit button (that wasn't invoked
        // from a messaging extension).
        this.onMessage(async (context, next): Promise<void> => {

            // Just a simple text message?
            if (context.activity.text) {
                await this.handleTextMessage(context, context.activity.text);
            }

            await next();
        });

        this.onInstallationUpdate(async (context, next): Promise<void> => {
            // If the app was updated or uninstalled, clear the welcome message state for the current user
            
            // Send welcome message...

            await next();
        });
    }

    
    protected handleTeamsTaskModuleFetch(context: TurnContext, taskModuleRequest: TaskModuleRequest): Promise<TaskModuleResponse> {
        return Promise.resolve({
            task: {
                type: "continue",
                value: {
                    url: this.baseUrl + "/StaticViews/form.html?replyToId=" + context.activity.replyToId,
                    title: "A form to complete",
                    width: "medium",
                    height: "medium"
                }
            }
        })
    }

    protected async handleTeamsTaskModuleSubmit(context: TurnContext, taskModuleRequest: TaskModuleRequest): Promise<TaskModuleResponse> {

        const replyToId = taskModuleRequest.data.replyToId;
        const state = this.state[replyToId];
        state.formValue = taskModuleRequest.data.formValue;
        const activity = MessageFactory.attachment(this.services.templatingService.getFlowAttachment("finish", context.activity.from.name, state));
        activity.id = replyToId;

        await context.updateActivity(activity);

        return <TaskModuleResponse><any>null;
    }

    // This is the entry point for the bot processing pipeline
    // Generally we want the base class to handle the initial processing
    // but this is a great place to save any state changes we've set
    // during the turn
    async run(context: TurnContext): Promise<void> {
        await super.run(context);
    }

    // This is a really simple implementation of the Strategy design pattern.
    // This could also be implemented with Dialogs which could be a better option if
    // we had more complex conversational flows between the user and the bot... but we dont!
    private async handleTextMessage(context: TurnContext, text: string) : Promise<void> {

        const commandText = text.trim().toLowerCase();
        const commandContainer = this.commands.find(x => commandText.startsWith(x.command.id))

        if (commandContainer) {

            let command = commandContainer.command;
            
            // Execute the command
            await command.execute(context);
        }
        else if (this.defaultCommand) {
            await this.defaultCommand.execute(context);
        }
        else {
            await context.sendActivity("Sorry, I didn't recognise that command. Type 'help' to see what I can do.");
        }
    }

    // Handles clicking an adaptive card button with `Action.Execute`
    protected async onAdaptiveCardInvoke(context: TurnContext, invokeValue: AdaptiveCardInvokeValue): Promise<AdaptiveCardInvokeResponse> {
        
        const state = this.state[context.activity.replyToId!];

        //Buttons with action.execute have a "verb" property to determine what the bot should do with the posted data
        switch(invokeValue.action.verb) {
            case "cancel":
                delete this.state[context.activity.replyToId!];
                return await this.invokeHandler.cancelFlow(context.activity.from.name);
            case "start":
                this.state[context.activity.replyToId!] = <FlowState>{
                    feedback: "",
                    feedbackFor: "",
                    scheduleFor: "",
                    formValue: "",
                    activityId: context.activity.replyToId,
                    formUrl: this.baseUrl
                };
                return await this.invokeHandler.startFlow(context.activity.from.name);
            case "makeChoice":
                return await this.invokeHandler.makeChoice(context.activity.from.name);
            case "madeChoice":
                state.choice = <string>invokeValue.action.data!.choice!;
                return await this.invokeHandler.madeChoice(context.activity.from.name, state);
            case "finish":
                this.state[context.activity.replyToId!];
                switch(state.choice) {
                    case "feedback":
                        state.feedbackFor = <string>invokeValue.action.data.feedbackFor!;
                        state.feedback = <string>invokeValue.action.data.feedback!;
                        break;
                    case "schedule":
                        state.scheduleFor = (<string>invokeValue.action.data.scheduleFor!).toString();
                        break;
                }
                return await this.invokeHandler.finishFlow(context.activity.from.name, state);
        }

        return {
            statusCode: 400,
            type: "",
            value: {}
        };
    }
}