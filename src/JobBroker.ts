type Cache = GoogleAppsScript.Cache.Cache;
type Trigger = GoogleAppsScript.Script.Trigger;

interface JobParameter {
    id: string;
    state: string;
    created_at: number;
    start_at?: number;
    end_at?: number;
    parameter: string;
}

class JobBroker {
    static readonly CACHE_KEY_PREFIX = 'JobBroker#';
    static readonly MAX_SLOT = 10;
    static readonly DELAY_DURATION = 100;
    // 1 Hour
    static readonly JOB_TIME_OUT = 3600000;

    private queue: Cache;
    private triggers: Trigger[];

    public constructor() {
        this.queue = CacheService.getScriptCache();
        this.triggers = ScriptApp.getProjectTriggers();
    }

    public enqueue(callback: Function, parameter: {}): void {
        if (callback.name === 'anonymous') {
            throw new Error('Unsupport anonymous callback function.');
        }
        if (this.triggers.length > JobBroker.MAX_SLOT) {
            throw new Error('Busy.');
        }

        const newTrigger: Trigger = ScriptApp.newTrigger(callback.name).timeBased().after(JobBroker.DELAY_DURATION).create();

        const jobParameter: JobParameter = {
            id: newTrigger.getUniqueId(),
            state: 'waiting',
            created_at: new Date().getTime(),
            parameter: JSON.stringify(parameter)
        };

        this.saveJob(newTrigger, jobParameter);
        console.info(`job enqueued. id: ${jobParameter.id}, handler: ${newTrigger.getHandlerFunction()}, created_at: ${jobParameter.created_at}, parameter: ${jobParameter.parameter}`);
    }

    public dequeue(): { job: JobParameter; trigger: Trigger } | null {
        for (let trigger of this.triggers) {
            const popJob = this.queue.get(this.getCacheKey(trigger));

            if (popJob) {
                const jobParameter: JobParameter = JSON.parse(popJob);
                const { state, start_at, id, created_at, parameter, end_at } = jobParameter;
                switch (state) {
                    case 'waiting':
                        return {
                            job: jobParameter,
                            trigger: trigger
                        };
                    case 'starting':
                        // timeout
                        if (new Date().getTime() - start_at > JobBroker.JOB_TIME_OUT) {
                            ScriptApp.deleteTrigger(trigger);
                            this.deleteJob(trigger);
                            console.info(`job time out. id: ${id}, handler: ${trigger.getHandlerFunction()}, created_at: ${created_at}, start_at: ${start_at}, parameter: ${parameter}`);
                        }
                        break;
                    case 'end':
                    case 'failed':
                    default:
                        ScriptApp.deleteTrigger(trigger);
                        this.deleteJob(trigger);
                        console.info(`job clear. id: ${id}, handler: ${trigger.getHandlerFunction()}, status: ${state} created_at: ${created_at}, start_at: ${start_at}, end_at: ${end_at}`);
                        break;
                }
            } else {
                console.info(`delete trigger. id: ${trigger.getUniqueId()}, handler: ${trigger.getHandlerFunction()}`);
                ScriptApp.deleteTrigger(trigger);
            }
        }

        return null;
    }

    public consumeJob(closure: Function): void {
        const pop: { job: JobParameter; trigger: Trigger } = this.dequeue();

        if (pop) {
            const { job, trigger } = pop;
            job.state = 'starting';
            job.start_at = new Date().getTime();
            this.saveJob(trigger, job);
            console.info(`job starting. id: ${job.id}, created_at: ${job.created_at}, start_at: ${job.start_at}, parameter: ${job.parameter}`);

            try {
                const parameter: {} = JSON.parse(job.parameter);

                closure(parameter);

                job.state = 'end';
                job.end_at = new Date().getTime();
                this.saveJob(trigger, job);
                console.info(`job success. id: ${job.id}, created_at: ${job.created_at}, start_at: ${job.end_at}, start_at: ${job.end_at}, parameter: ${job.parameter}`);
            } catch (e) {
                job.state = 'failed';
                job.end_at = new Date().getTime();
                this.saveJob(trigger, job);
                console.warn(`job failed. message: ${e.message}, trace: ${e.trace}, id: ${job.id}, created_at: ${job.created_at}, start_at: ${job.end_at}, start_at: ${job.end_at}, parameter: ${job.parameter}`);
            }

            return;
        }

        console.info(`Nothing active job.`);
    }

    private getCacheKey(trigger: Trigger): string {
        return `${JobBroker.CACHE_KEY_PREFIX}${trigger.getUniqueId()}`;
    }

    private saveJob(trigger: Trigger, jobParameter: JobParameter): void {
        this.queue.put(this.getCacheKey(trigger), JSON.stringify(jobParameter));
    }

    private deleteJob(trigger: Trigger): void {
        this.queue.remove(this.getCacheKey(trigger));
    }
}

export { JobBroker, JobParameter }