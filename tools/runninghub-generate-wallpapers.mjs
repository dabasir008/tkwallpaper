import fs from "node:fs/promises";

const RH_KEY = process.env.RUNNINGHUB_API_KEY;
const configPath = process.argv[2] || "config/runninghub-wallpaper-jobs.json";
const outputPath = process.argv[3] || "data/runninghub-generated-wallpapers.json";
const RUN_BASE = "https://www.runninghub.cn/openapi/v2/run/ai-app/";
const QUERY_URL = "https://www.runninghub.cn/openapi/v2/query";

if (!RH_KEY) throw new Error("RUNNINGHUB_API_KEY is not configured");

const config = JSON.parse(await fs.readFile(configPath, "utf8"));
if (!config.appId) throw new Error("config.appId is required. Use a RunningHub text-to-image or image-to-image app id.");

function buildNodeInfoList(job) {
  if (Array.isArray(job.nodeInfoList)) return job.nodeInfoList;
  const promptNodeId = job.promptNodeId || config.promptNodeId;
  const promptFieldName = job.promptFieldName || config.promptFieldName;
  if (!promptNodeId || !promptFieldName) {
    throw new Error(`Job ${job.slug} needs nodeInfoList, or promptNodeId + promptFieldName`);
  }
  const nodeInfoList = [
    { nodeId: String(promptNodeId), fieldName: promptFieldName, fieldValue: job.prompt },
  ];
  const aspectRatioNodeId = job.aspectRatioNodeId || config.aspectRatioNodeId;
  const aspectRatioFieldName = job.aspectRatioFieldName || config.aspectRatioFieldName;
  if (aspectRatioNodeId && aspectRatioFieldName) {
    nodeInfoList.unshift({
      nodeId: String(aspectRatioNodeId),
      fieldName: aspectRatioFieldName,
      fieldValue: job.aspectRatio || config.aspectRatio || "9:16",
    });
  }

  const negativeNodeId = job.negativeNodeId || config.negativeNodeId;
  const negativeFieldName = job.negativeFieldName || config.negativeFieldName;
  if (negativeNodeId && negativeFieldName) {
    nodeInfoList.push({
      nodeId: String(negativeNodeId),
      fieldName: negativeFieldName,
      fieldValue: job.negativePrompt ?? config.negativePrompt ?? "",
    });
  }
  return nodeInfoList.concat(Array.isArray(job.extraNodeInfoList) ? job.extraNodeInfoList : []);
}

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RH_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(data?.error || data?.message || resp.statusText);
  return data;
}

async function runJob(job) {
  const submit = await postJson(RUN_BASE + config.appId, {
    nodeInfoList: buildNodeInfoList(job),
    instanceType: config.instanceType || "default",
    usePersonalQueue: String(config.usePersonalQueue || "false"),
  });
  const taskId = submit.taskId || submit.data?.taskId;
  if (!taskId) throw new Error(`No taskId returned for ${job.slug}`);
  if (process.env.RUNNINGHUB_SUBMIT_ONLY === "1") {
    return { ...job, taskId, submit };
  }

  const pollSeconds = Number(config.pollSeconds || 10);
  const maxPolls = Number(config.maxPolls || 90);
  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollSeconds * 1000));
    const result = await postJson(QUERY_URL, { taskId });
    if (result.status === "SUCCESS" || result.data?.status === "SUCCESS") {
      return { ...job, taskId, result };
    }
    if (result.status === "FAILED" || result.data?.status === "FAILED") {
      throw new Error(`RunningHub failed ${job.slug}: ${JSON.stringify(result)}`);
    }
  }
  throw new Error(`Timed out waiting for ${job.slug}`);
}

const jobLimit = Number(process.env.RUNNINGHUB_JOB_LIMIT || 0);
const jobs = jobLimit > 0 ? (config.jobs || []).slice(0, jobLimit) : (config.jobs || []);

const outputs = [];
for (const job of jobs) {
  console.log(`Running ${job.slug}...`);
  const output = await runJob(job);
  outputs.push(output);
  await fs.writeFile(outputPath, JSON.stringify(outputs, null, 2) + "\n", "utf8");
}

await fs.writeFile(outputPath, JSON.stringify(outputs, null, 2) + "\n", "utf8");
console.log(`Saved ${outputs.length} generated results to ${outputPath}`);
