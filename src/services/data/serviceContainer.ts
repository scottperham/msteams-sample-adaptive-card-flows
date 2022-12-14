
import { TemplatingService } from "./templatingService";


export class ServiceContainer {
    public templatingService: TemplatingService;

    constructor() {
        this.templatingService = new TemplatingService();
    }

    public loadTemplates(templatesPath: string) {
        this.templatingService.load(templatesPath);
    }
}
