var cdb = require('cartodb.js');
var DatasetsItem = require('../../new_dashboard/datasets/datasets_item');
var navigateThroughRouter = require('../../new_common/view_helpers/navigate_through_router');
var UploadConfig = require('../../new_common/upload_config');
var Utils = require('cdb.Utils');
var pluralizeString = require('../../new_common/view_helpers/pluralize_string');

/**
 *  Remote dataset item view
 *
 */

module.exports = DatasetsItem.extend({

  tagName: 'li',
  className: 'DatasetsList-item',

  events: {
    'click .js-tag-link': navigateThroughRouter,
    'click': '_selectDataset'
  },

  initialize: function() {
    this.user = this.options.user;
    this.router = this.options.router;
    this.template = cdb.templates.getTemplate('new_dashboard/views/remote_datasets_item');
    this.table = new cdb.admin.CartoDBTableMetadata(this.model.get('external_source'));

    this._initBinds();
  },

  render: function() {
    var vis = this.model;
    var user = this.user;
    var table = this.table;
    var tags = vis.get('tags') || [];
    var description = vis.get('description') && Utils.stripHTML(markdown.toHTML(vis.get('description'))) || '';
    var source = vis.get('source') && markdown.toHTML(vis.get('source')) || '';

    var d = {
      isRaster:                vis.get('kind') === 'raster',
      geometryType:            table.statsGeomColumnTypes().length > 0 ? table.statsGeomColumnTypes()[0] : '',
      title:                   vis.get('name'),
      source:                  source,
      description:             description,
      timeDiff:                moment(vis.get('updated_at')).fromNow(),
      tags:                    tags,
      tagsCount:               tags.length,
      routerModel:             this.router.model,
      maxTagsToShow:           3,
      canImportDataset:        this._canImportDataset(),
      rowCount:                undefined,
      datasetSize:             undefined
    };

    var rowCount = table.get('row_count');
    if (rowCount >= 0) {
      d.rowCount = ( rowCount < 10000 ? Utils.formatNumber(rowCount) : Utils.readizableNumber(rowCount) );
      d.pluralizedRows = pluralizeString('Row', rowCount);
    }

    var datasetSize = table.get('size');
    if (datasetSize >= 0) {
      d.datasetSize = Utils.readablizeBytes(datasetSize, true);
    }

    this.$el.html(this.template(d));
    this._setItemClasses();
    this._renderTooltips();

    return this;
  },

  _renderTooltips: function() {
    this.addView(
      new cdb.common.TipsyTooltip({
        el: this.$('.DatasetsList-itemStatus'),
        title: function(e) {
          return $(this).attr('data-title')
        }
      })
    )
  },

  _setItemClasses: function() {
    // Item selected?
    this.$el[ this.model.get('selected') ? 'addClass' : 'removeClass' ]('is--selected');
    // Check if it is selectable
    this.$el[ this._canImportDataset() ? 'addClass' : 'removeClass' ]('DatasetsList-item--selectable');
    // Check if it is importable
    this.$el[ this._canImportDataset() ? 'removeClass' : 'addClass' ]('DatasetsList-item--banned');
  },

  _canImportDataset: function() {
    return ( this.user.get('remaining_byte_quota') * UploadConfig.fileTimesBigger ) >= ( this.table.get('size') || 0 )
  },

  _selectDataset: function(ev) {
    if (ev.target.tagName !== 'A') {
      // If it fits on user quota, user can select it
      if (this._canImportDataset()) {
        this.killEvent(ev);
        this.model.set('selected', !this.model.get('selected'));  
      }
    }
  }

});
