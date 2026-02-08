'use strict';

global.videojs = require('video.js');

const Annotation = require('../../../src/js/components/annotation'),
  expect = require('chai').expect;

class MockedAnnotation extends Annotation {
  get plugin() {
    return { options: {}, videoSrc: 'http://example.com/video.mp4' };
  }
  buildComments(data) {
    this.commentList = { data: [], _internalData: data.comments || [] };
  }
  buildMarker() {}
  buildShape() {}
  bindEvents() {}
  buildEventDispatcher() {}
}

describe('Annotation', () => {
  describe('get data', () => {
    it('returns the data the annotation was initalized with', () => {
      let annotationData = {
        id: 'myId',
        range: { start: 55, end: 60 },
        shape: { x1: 23.47, y1: 9.88, x2: 60.83, y2: 44.2 },
        comments: [
          {
            id: 'myCommentId',
            body: 'My comment',
            meta: {
              datetime: '2017-03-28T19:17:32.238Z',
              user_id: 1,
              user_name: 'Alex Ackerman'
            }
          }
        ]
      };

      let annotation = new MockedAnnotation(annotationData, 'fakePlayerId');
      let data = annotation.data;

      expect(data.type).to.equal('Annotation');
      expect(data.id).to.equal('myId');
      expect(data.motivation).to.equal('commenting');
      expect(data.body.value).to.equal('My comment');
      expect(data.target.source).to.equal('http://example.com/video.mp4');
      expect(data.target.selector.value).to.equal('t=55,60&xywh=percent:23.47,9.88,37.36,34.32');
      expect(data.creator.name).to.equal('Alex Ackerman');
      expect(data.creator.id).to.equal('1');
      expect(data._replies).to.be.an('array').that.is.empty;
    });
  });
});
