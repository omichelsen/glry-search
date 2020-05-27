const fs = require('fs')
const path = require('path')
const { createWorker } = require('tesseract.js')

// sips -s format png archive/2020/*.gif --out archive/2020 && rm archive/2020/*.gif
const dir = path.join(__dirname, '../archive/2020')

fs.readdir(dir, async (err, files) => {
	if (err) {
		return console.error(`error reading dir: ${err}`)
	}

	const worker = createWorker({
		logger: console.log,
	})

	await worker.load()
	await worker.loadLanguage('eng')
	await worker.initialize('eng')

	await files
		.filter((f) => f.endsWith('.png'))
		.reduce(async (promise, file) => {
			return promise.then(async (results) => {
				const filePath = path.join(dir, file)
				console.log(`reading ${filePath}`)
				const {
					data: { text },
				} = await worker.recognize(filePath, {})

				fs.writeFile(filePath.replace('.png', '.txt'), text, (err) => {
					if (err) {
						console.error(err)
					}
				})

				return [...results, text]
			})
		}, Promise.resolve([]))

	await worker.terminate()
})
