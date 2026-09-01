import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export default async function handler(req: Request) {
  if (req.method === 'GET') {
    const rows = await sql`SELECT id, deployment_id AS "deploymentId", deployment_date AS date, deployment_time AS time, event, venue, task, status, progress, crew_leads AS "crewLeads", staff_members AS "staffMembers", vehicle FROM warehouse_deployments ORDER BY created_at DESC`
    return Response.json(rows)
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const rows = await sql`
      INSERT INTO warehouse_deployments (id, deployment_id, deployment_date, deployment_time, event, venue, task, status, progress, crew_leads, staff_members, vehicle)
      VALUES (${body.id}, ${body.deploymentId}, ${body.date}, ${body.time}, ${body.event}, ${body.venue}, ${body.task}, ${body.status}, ${body.progress}, ${JSON.stringify(body.crewLeads)}, ${JSON.stringify(body.staffMembers)}, ${body.vehicle})
      ON CONFLICT (deployment_id) DO UPDATE SET status = EXCLUDED.status, progress = EXCLUDED.progress
      RETURNING id, deployment_id AS "deploymentId", deployment_date AS date, deployment_time AS time, event, venue, task, status, progress, crew_leads AS "crewLeads", staff_members AS "staffMembers", vehicle
    `
    return Response.json(rows[0], { status: 201 })
  }

  return new Response('Method not allowed', { status: 405 })
}
