
const AWS = require('aws-sdk')

// Expected env vars:
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
// S3_BUCKET_NAME
// SES_FROM_EMAIL (verified in SES), RECIPIENT_COPY (vedaarnastudio@gmail.com by default)

const s3 = new AWS.S3()
const ses = new AWS.SES({ apiVersion: '2010-12-01' })

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body)
    const { base64, filename, customer, invoiceMeta, total } = body
    if (!base64 || !filename) return { statusCode: 400, body: 'Missing PDF data' }

    const bucket = process.env.S3_BUCKET_NAME
    if (!bucket) return { statusCode: 500, body: 'S3_BUCKET_NAME not configured' }

    const key = `invoices/${Date.now()}-${filename}`

    // Upload to S3
    const buffer = Buffer.from(base64, 'base64')
    await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ACL: 'public-read'
    }).promise()

    const url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

    // Send email via SES
    const from = process.env.SES_FROM_EMAIL
    const recipient = customer && customer.email ? customer.email : null
    const copyTo = process.env.RECIPIENT_COPY || 'vedaarnastudio@gmail.com'

    const params = {
      Destination: {
        ToAddresses: [copyTo]
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `<p>Invoice ${invoiceMeta.number} for ${customer.name || ''}.</p><p>Total: ₹ ${total}</p><p>Download: <a href="${url}">${url}</a></p>`
          }
        },
        Subject: { Data: `VedAarna Invoice ${invoiceMeta.number}` }
      },
      Source: from
    }

    // If customer email provided, add to ToAddresses and send
    if (recipient) {
      params.Destination.ToAddresses.push(recipient)
    }

    await ses.sendEmail(params).promise()

    return {
      statusCode: 200,
      body: JSON.stringify({ url })
    }

  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: 'Error: ' + (err.message || err) }
  }
}
