const Spice = require('../models/spiceModel');
const Tag = require('../models/tagModel');
const Recipe = require('../models/recipeModel');
const path = require('path');
const fs = require('fs');
const bucket = require('../config/googleCloud');

const addSpice = async (req, res) => {
  const { name, tags, description, benefits } = req.body;
  const imageFile = req.file;
  const fileName = Date.now() + path.extname(imageFile.originalname);

  try {
    await bucket.upload(imageFile.path, {
      destination: `spices/${fileName}`,
      metadata: {
        contentType: imageFile.mimetype
      },
      predefinedAcl: 'publicRead'
    });
    fs.unlinkSync(imageFile.path);

    const imageUrl = `https://storage.googleapis.com/${bucket.name}/spices/${fileName}`;
    const [spiceResults] = await Spice.add(name, imageUrl, description, benefits);
    const spiceId = spiceResults.insertId;

    if (tags) {
      await Tag.addBatch(tags.map((tag) => [tag, spiceId, 'spices']));
    }

    return res.status(201).json({
      status: 'success',
      message: 'Spice added successfully',
      data: {
        spiceId: spiceId
      }
    });
  } catch (err) {
    console.error(`Error occured: ${err.message}`);
    return res.status(500).json({ status: 'fail', message: 'Add Spice Failed!' });
  }
};

const editSpice = async (req, res) => {
  const spiceId = req.params.id;

  try {
    const [spiceResults] = await Spice.getById(spiceId);
    const spice = spiceResults[0];
    const { name = spice.name, tags, description = spice.description, benefits = spice.benefits } = req.body;
    let { imageUrl = spice.imageUrl } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      await Spice.edit(name, imageUrl, description, benefits, spiceId);
    } else {
      const fileName = Date.now() + path.extname(imageFile.originalname);

      const urlParts = new URL(imageUrl);
      const filePath = urlParts.pathname.replace(`/${bucket.name}/`, '');
      await bucket.file(`${filePath}`).delete();

      await bucket.upload(imageFile.path, {
        destination: `spices/${fileName}`,
        metadata: {
          contentType: imageFile.mimetype
        },
        predefinedAcl: 'publicRead'
      });
      fs.unlinkSync(imageFile.path);

      imageUrl = `https://storage.googleapis.com/${bucket.name}/spices/${fileName}`;

      await Spice.edit(name, imageUrl, description, benefits, spiceId);
    }

    if (tags) {
      await Tag.deleteAll(spiceId, 'spices');
      await Tag.addBatch(tags.map((tag) => [tag, spiceId, 'spices']));
    }

    return res.json({
      status: 'success',
      message: 'Spice edited successfully'
    });
  } catch (err) {
    console.error(`Error occured: ${err.message}`);
    return res.status(500).json({ status: 'fail', message: 'Edit Spice Failed!' });
  }
};

const getSpiceDetails = async (req, res) => {
  const spiceId = req.params.id;

  try {
    const [spiceResults] = await Spice.getById(spiceId);
    const spice = spiceResults[0];
    const [tagResults] = await Tag.getAll(spiceId, 'spices');
    const tags = tagResults ? tagResults.map((tag) => tag.tag) : [];
    const [recipeResults] = await Recipe.search(spice.name);
    const jamuList = recipeResults.map((recipe) => recipe.name);

    if (spiceResults.length === 0) return res.status(404).json({ status: 'fail', message: 'Spice not found' });

    return res.json({
      status: 'success',
      data: {
        spice: {
          ...spice,
          tags: tags,
          jamuList
        }
      }
    });

  } catch (err) {
    console.log(`Error occured: ${err.message}`);
    return res.status(500).json({ status: 'fail', message: 'Can not get spice details' });
  }
};

const searchAllSpices = async (req, res) => {
  const searchKeyword = req.query.search;

  try {
    const [spiceResults] = searchKeyword ? await Spice.search(searchKeyword) : await Spice.getAll();

    const spices = await Promise.all(
      spiceResults.map(async (spice) => {
        spice.tags = spice.tags ? spice.tags.split(',') : [];
        const [recipeResults] = await Recipe.search(spice.name);
        const jamuList = recipeResults.map((recipe) => recipe.name);
        spice.jamuList = jamuList;
        return spice;
      })
    );

    return res.json({
      status: 'success',
      data: {
        spices: spices
      }
    });
  } catch (err) {
    console.error(`Error occured: ${err.message}`);
    return res.status(500).json({ status: 'fail', message: 'Can not get spices data' });
  }
};

const deleteSpice = async (req, res) => {
  const spiceId = req.params.id;

  try {
    const [spiceResults] = await Spice.delete(spiceId);

    if (spiceResults.affectedRows === 0) return res.status(404).json({ status: 'fail', message: 'Spice not found' });

    return res.json({
      status: 'success',
      message: 'Spice deleted successfully'
    });
  } catch (err) {
    console.error(`Error occured: ${err.message}`);
    res.status(500).json({ status: 'fail', message: 'Delete spice failed' });
  }
};

module.exports = {
  addSpice,
  editSpice,
  getSpiceDetails,
  searchAllSpices,
  deleteSpice
};