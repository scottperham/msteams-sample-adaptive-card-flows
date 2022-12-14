import * as fs from 'fs';
import * as path from 'path';
import * as act from 'adaptivecards-templating';
import { ActionTypes, Attachment, CardFactory } from "botbuilder";


export class TemplatingService {

    templates: {[key: string]: string} = {};
    templatesPath: string = "";

    public load(templatesPath: string) {
        this.templatesPath = templatesPath;

        this.templates["hello"] = fs.readFileSync(path.join(templatesPath, "hello.json")).toString();
        this.templates["start"] = fs.readFileSync(path.join(templatesPath, "start.json")).toString();
        this.templates["finish"] = fs.readFileSync(path.join(templatesPath, "finish.json")).toString();

        this.templates["options"] = fs.readFileSync(path.join(templatesPath, "options.json")).toString();

        this.templates["feedback"] = fs.readFileSync(path.join(templatesPath, "feedback.json")).toString();
        this.templates["schedule"] = fs.readFileSync(path.join(templatesPath, "schedule.json")).toString();
        this.templates["form"] = fs.readFileSync(path.join(templatesPath, "formModule.json")).toString();
    }

    public getFlowAttachment(step: string, name: string, data?: object) : Attachment {
        const template = new act.Template(JSON.parse(this.templates[step]));
        const payload = template.expand({
            $root: {
                name,
                ...data
            }
        });

        return CardFactory.adaptiveCard(payload);    
    }
}
