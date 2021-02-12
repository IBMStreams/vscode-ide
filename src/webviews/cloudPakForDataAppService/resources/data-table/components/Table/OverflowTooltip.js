import { TooltipDefinition } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

const OverflowTooltip = ({ children, direction }) => {
  const textRef = useRef();
  const [truncated, setTruncated] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);

  // Check truncation on text update or window size change
  useEffect(() => {
    const compare =
      textRef &&
      textRef.current &&
      textRef.current.scrollWidth > textRef.current.clientWidth;
    setTruncated(compare);
  }, [children, width]);

  // Re-render on window size change
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  let displayValue = children;
  let displayAsJson = false;
  const displayAsNull = children === null;
  if (typeof children === 'boolean') {
    displayValue = children.toString();
  } else if (
    Array.isArray(children) ||
    Object.prototype.toString.call(children) === '[object Object]'
  ) {
    displayValue = JSON.stringify(children, null, 2);
    displayAsJson = true;
  }

  const overflowTooltipTextNode = (
    <div ref={textRef} className="overflow-tooltip__text">
      {displayAsNull ? (
        <div className="overflow-tooltip__text--optional">null</div>
      ) : (
        displayValue
      )}
    </div>
  );

  let tooltipText = displayValue;
  if (displayAsJson) {
    tooltipText = <pre>{displayValue}</pre>;
  } else if (displayAsNull) {
    tooltipText = <div className="overflow-tooltip__text--optional">null</div>;
  }

  return truncated ? (
    <TooltipDefinition
      className="overflow-tooltip__container"
      triggerClassName="overflow-tooltip"
      tooltipText={tooltipText}
      direction={direction}
      open
    >
      {overflowTooltipTextNode}
    </TooltipDefinition>
  ) : (
    overflowTooltipTextNode
  );
};

OverflowTooltip.defaultProps = {
  children: null
};

OverflowTooltip.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
    PropTypes.array,
    PropTypes.object
  ]),
  direction: PropTypes.string.isRequired
};

export default OverflowTooltip;
