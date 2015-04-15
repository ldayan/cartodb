var AddLayerModel = require('../../../../../../javascripts/cartodb/new_common/dialogs/map/add_layer_model');
var sharedForCreateListingViewModel = require('../create/shared_for_create_listing_view_model');
var sharedForCreateListingImportViewModel = require('../create/listing/shared_for_import_view_model');
var sharedForCreateFromScratchViewModel = require('../create/listing/shared_for_create_from_scratch_view_model');

describe('new_common/dialogs/map/add_layer_model', function() {
  beforeEach(function() {
    this.user = new cdb.admin.User({
      username: 'pepe',
      base_url: 'http://cartodb.com'
    });

    this.map = jasmine.createSpyObj('cdb.admin.Map', ['addCartodbLayerFromTable']);
    this.vis = jasmine.createSpyObj('cdb.admin.Visualization', ['tableMetadata']);

    this.model = new AddLayerModel({
    }, {
      map: this.map,
      vis: this.vis,
      user: this.user
    });
  });

  sharedForCreateListingViewModel.call(this);
  sharedForCreateListingImportViewModel.call(this);
  sharedForCreateFromScratchViewModel.call(this);

  it('should have listing as default content pane', function() {
    expect(this.model.get('contentPane')).toEqual('listing');
  });

  describe('when an dataset is selected', function() {
    describe('when dataset is a remote one (from library)', function() {
      beforeEach(function() {
        cdb.god.bind('remoteSelected', function(data) {
          this.remoteSelected = data;
        }, this);

        this.model.collection.reset([{
          id: 'abc-123',
          type: 'remote',
          name: 'foobar',
          external_source: {
            size: 1024
          }
        }]);
        this.model.collection.at(0).set('selected', true);
      });

      it('should trigger a remoteSelected event on the cdb.god event bus', function() {
        expect(this.remoteSelected).toBeTruthy();
      });

      it('should pass a metadata object with necessary data to import dataset', function() {
        expect(this.remoteSelected).toEqual(jasmine.objectContaining({ type: 'remote' }));
        expect(this.remoteSelected).toEqual(jasmine.objectContaining({ value: 'foobar' }));
        expect(this.remoteSelected).toEqual(jasmine.objectContaining({ remote_visualization_id: 'abc-123' }));
        expect(this.remoteSelected).toEqual(jasmine.objectContaining({ size: 1024 }));
        expect(this.remoteSelected).toEqual(jasmine.objectContaining({ create_vis: false }));
      });
    });

    describe('when dataset is not a remote one', function() {
      beforeEach(function() {
        this.model.bind('addLayerDone', function() {
          this.addLayerDoneCalled = true;
        }, this);
        this.model.bind('addLayerFail', function() {
          this.addLayerFailCalled = true;
        }, this);

        this.map.layers = jasmine.createSpyObj('layers', ['saveLayers']);

        this.model.collection.reset([{
          table: {
            name: 'foobar_table'
          },
          type: 'table'
        }]);
        this.model.collection.at(0).set('selected', true);
      });

      it('should create layer from dataset', function() {
        expect(this.map.addCartodbLayerFromTable).toHaveBeenCalled();
      });

      it('should create layer with expected params', function() {
        expect(this.map.addCartodbLayerFromTable.calls.argsFor(0)[0]).toEqual('foobar_table');
        expect(this.map.addCartodbLayerFromTable.calls.argsFor(0)[1]).toEqual('pepe');
        expect(this.map.addCartodbLayerFromTable.calls.argsFor(0)[2]).toEqual(jasmine.objectContaining({
          vis: this.vis
        }));
      });

      it('should change the content view setting', function() {
        expect(this.model.get('contentPane')).toEqual('loading');
      });

      describe('when adding layer succeeds', function() {
        beforeEach(function() {
          expect(this.addLayerDoneCalled).toBeFalsy();
          this.map.addCartodbLayerFromTable.calls.argsFor(0)[2].success();
        });

        it('should trigger addLayerDone', function() {
          expect(this.addLayerDoneCalled).toBeTruthy();
        });

        it('should save layers', function() {
          expect(this.map.layers.saveLayers).toHaveBeenCalled();
        });
      });

      describe('when adding layer fails', function() {
        beforeEach(function() {
          expect(this.addLayerFailCalled).toBeFalsy();
          this.map.addCartodbLayerFromTable.calls.argsFor(0)[2].error();
        });

        it('should trigger addLayerFail', function() {
          expect(this.addLayerFailCalled).toBeTruthy();
        });
      });

      describe('.createFromScratch', function() {
        beforeEach(function() {
          var self = this;
          spyOn(cdb.admin.CartoDBTableMetadata.prototype, 'save').and.callFake(function() {
            self.table = this;
            return this;
          });
          this.model.createFromScratch();
        });

        it('should change to loading state', function() {
          expect(this.model.get('contentPane')).toEqual('loading');
        });

        it('should save a new dataset table', function() {
          expect(cdb.admin.CartoDBTableMetadata.prototype.save).toHaveBeenCalled();
        });

        describe('when table is successfully created', function() {
          beforeEach(function() {
            this.table.set('name', 'name-just-for-testing-purposes', { silent: true });
            cdb.admin.CartoDBTableMetadata.prototype.save.calls.argsFor(0)[1].success();
          });

          it('should add the table as new layer', function() {
            expect(this.map.addCartodbLayerFromTable).toHaveBeenCalled();
            expect(this.map.addCartodbLayerFromTable).toHaveBeenCalledWith('name-just-for-testing-purposes', 'pepe', jasmine.any(Object));
          });
        });
      });
    });
  });
});